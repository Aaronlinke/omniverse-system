import numpy as np
from opensimplex import OpenSimplex
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging

# --- Basis-Strukturen und -Klassen ---

class WorldChunk:
    """
    Repräsentiert einen einzelnen Abschnitt der Spielwelt.
    Speichert Terraintypen, Höhenwerte und die Position von Objekten.
    """
    def __init__(self, x_offset: int, y_offset: int, size: int):
        self.x_offset = x_offset
        self.y_offset = y_offset
        self.size = size
        # Initialisiere Datenstrukturen für diesen Chunk
        self.heightmap = np.zeros((size, size), dtype=np.float32)  # Höhenwerte
        self.biomemap = np.full((size, size), 'Plains', dtype=object)  # Biom-Typen
        self.objects = []  # Liste von Objekten im Format (type, x_rel, y_rel, z_rel)

    def get_world_coords(self, x_rel: int, y_rel: int) -> tuple:
        """Konvertiert relative Chunk-Koordinaten in Weltkoordinaten."""
        return self.x_offset + x_rel, self.y_offset + y_rel

    def to_dict(self):
        """Konvertiert den Chunk in ein JSON-serialisierbares Dictionary."""
        return {
            'x_offset': self.x_offset,
            'y_offset': self.y_offset,
            'size': self.size,
            'heightmap': self.heightmap.tolist(),
            'biomemap': self.biomemap.tolist(),
            'objects': self.objects
        }

    def __repr__(self):
        return f"WorldChunk(x={self.x_offset}, y={self.y_offset}, size={self.size})"


class WorldGrid:
    """
    Verwaltet das Laden, Entladen und den Zugriff auf WorldChunks.
    Simuliert ein unendliches Gitter von Chunks.
    """
    def __init__(self, chunk_size: int):
        self.chunk_size = chunk_size
        self._loaded_chunks = {}

    def get_chunk(self, world_x: int, world_y: int) -> WorldChunk:
        """
        Gibt den Chunk an den gegebenen Weltkoordinaten zurück.
        Lädt ihn bei Bedarf oder erstellt einen neuen.
        """
        chunk_x_offset = (world_x // self.chunk_size) * self.chunk_size
        chunk_y_offset = (world_y // self.chunk_size) * self.chunk_size
        chunk_key = (chunk_x_offset, chunk_y_offset)

        if chunk_key not in self._loaded_chunks:
            new_chunk = WorldChunk(chunk_x_offset, chunk_y_offset, self.chunk_size)
            self._loaded_chunks[chunk_key] = new_chunk
            print(f"[WorldGrid] Neuer Chunk geladen/erstellt: {new_chunk}")
        return self._loaded_chunks[chunk_key]


class InfluenceMap:
    """
    Stellt eine 'Einflusskarte' dar, die die Generierung in bestimmten Bereichen steuert.
    Z.B. für Story-Punkte, Ressourcen-Hotspots oder spezielle Terrain-Typen.
    """
    def __init__(self, name: str, data: dict, default_value: float = 0.0):
        self.name = name
        self.data = data  # {(world_x, world_y): influence_value, ...}
        self.default_value = default_value

    def get_influence(self, world_x: int, world_y: int) -> float:
        """Gibt den Einflusswert für eine Weltkoordinate zurück."""
        return self.data.get((world_x, world_y), self.default_value)


# --- Modulare Generierungs-Komponenten (ABSTRAKTE KLASSEN) ---

class IWorldComponent:
    """
    Abstrakte Basisklasse für Weltgenerierungs-Komponenten.
    Jede Komponente ist für einen spezifischen Aspekt der Weltgenerierung zuständig.
    """
    def __init__(self, seed: int):
        self.seed = seed

    def generate_chunk_data(self, chunk: WorldChunk, world_grid: WorldGrid,
                            influence_maps: dict[str, InfluenceMap]):
        """Generiert Daten für den gegebenen Chunk.
        Muss von Unterklassen implementiert werden.
        """
        raise NotImplementedError("Diese Methode muss von einer Unterklasse implementiert werden.")


# --- KONKRETE GENERIERUNGS-KOMPONENTEN ---

class TerrainGeneratorComponent(IWorldComponent):
    """
    Generiert die Höhenkarte für einen Chunk mittels Perlin/Simplex-Rauschen.
    """
    def __init__(self, seed: int, scale: float = 0.01, octaves: int = 4, persistence: float = 0.5,
                 lacunarity: float = 2.0, elevation_offset: float = 0.0, elevation_amplitude: float = 100.0):
        super().__init__(seed)
        self.noise = OpenSimplex(seed=seed)
        self.scale = scale
        self.octaves = octaves
        self.persistence = persistence
        self.lacunarity = lacunarity
        self.elevation_offset = elevation_offset
        self.elevation_amplitude = elevation_amplitude

    def generate_chunk_data(self, chunk: WorldChunk, world_grid: WorldGrid,
                            influence_maps: dict[str, InfluenceMap]):
        for y_rel in range(chunk.size):
            for x_rel in range(chunk.size):
                world_x, world_y = chunk.get_world_coords(x_rel, y_rel)

                # Einfluss der Höhenkarte (z.B. für Gebirgszüge)
                elevation_influence = influence_maps.get('elevation', InfluenceMap('', {})).get_influence(world_x, world_y)

                noise_value = 0.0
                frequency = self.scale
                amplitude = 1.0

                for _ in range(self.octaves):
                    noise_value += self.noise.noise2d(world_x * frequency, world_y * frequency) * amplitude
                    amplitude *= self.persistence
                    frequency *= self.lacunarity

                # Normalisiere Rauschen von [-1, 1] auf [0, 1] und wende Amplitude/Offset an
                height = (noise_value + 1) / 2.0  # Normalisiere auf [0, 1]
                height = self.elevation_offset + height * self.elevation_amplitude

                # Berücksichtige den Einfluss für die Höhe
                height += elevation_influence * self.elevation_amplitude * 0.5

                chunk.heightmap[y_rel, x_rel] = height


class BiomeGeneratorComponent(IWorldComponent):
    """
    Generiert Biome basierend auf Höhe und Rauschen.
    """
    def __init__(self, seed: int, scale: float = 0.05):
        super().__init__(seed)
        self.noise = OpenSimplex(seed=seed + 1)
        self.scale = scale

    def generate_chunk_data(self, chunk: WorldChunk, world_grid: WorldGrid,
                            influence_maps: dict[str, InfluenceMap]):
        for y_rel in range(chunk.size):
            for x_rel in range(chunk.size):
                world_x, world_y = chunk.get_world_coords(x_rel, y_rel)
                height = chunk.heightmap[y_rel, x_rel]

                # Einfluss der Biome (z.B. erzwungene Wüste)
                biome_influence = influence_maps.get('biome', InfluenceMap('', {})).get_influence(world_x, world_y)

                # Kombiniere Höhe und Rauschen für Biome
                temp_noise = (self.noise.noise2d(world_x * self.scale, world_y * self.scale) + 1) / 2.0

                biome = 'Plains'
                if height < 20:
                    biome = 'Ocean'
                elif height < 50:
                    biome = 'Beach'
                elif temp_noise > 0.7 + biome_influence * 0.3:
                    biome = 'Desert'
                elif height > 70:
                    biome = 'Mountains'
                elif temp_noise < 0.3 - biome_influence * 0.3:
                    biome = 'Forest'

                chunk.biomemap[y_rel, x_rel] = biome


class ObjectPlacementComponent(IWorldComponent):
    """
    Platziert Objekte (Bäume, Steine, etc.) basierend auf Biomen und Rauschen.
    """
    def __init__(self, seed: int, tree_density: float = 0.6, rock_density: float = 0.3):
        super().__init__(seed)
        self.tree_noise = OpenSimplex(seed=seed + 2)
        self.rock_noise = OpenSimplex(seed=seed + 3)
        self.tree_density = tree_density
        self.rock_density = rock_density

    def generate_chunk_data(self, chunk: WorldChunk, world_grid: WorldGrid,
                            influence_maps: dict[str, InfluenceMap]):
        for y_rel in range(chunk.size):
            for x_rel in range(chunk.size):
                world_x, world_y = chunk.get_world_coords(x_rel, y_rel)
                biome = chunk.biomemap[y_rel, x_rel]
                height = chunk.heightmap[y_rel, x_rel]

                # Einfluss der Objektplatzierung (z.B. für speziellen Baum)
                object_influence = influence_maps.get('objects', InfluenceMap('', {})).get_influence(world_x, world_y)

                # Beispiel für Baumplatzierung in Wäldern
                if biome == 'Forest':
                    tree_val = (self.tree_noise.noise2d(world_x * 0.1, world_y * 0.1) + 1) / 2.0
                    if tree_val > (1.0 - self.tree_density) - object_influence * 0.2:
                        chunk.objects.append(('Tree', x_rel, y_rel, height + 1))

                # Beispiel für Steinplatzierung in Bergen
                if biome == 'Mountains':
                    rock_val = (self.rock_noise.noise2d(world_x * 0.2, world_y * 0.2) + 1) / 2.0
                    if rock_val > (1.0 - self.rock_density) - object_influence * 0.2:
                        chunk.objects.append(('Rock', x_rel, y_rel, height + 0.5))


class WorldGenerator:
    """
    Orchestriert die Weltgenerierung unter Verwendung modularer Komponenten.
    """
    def __init__(self, chunk_size: int = 16, seed: int = 42):
        self.chunk_size = chunk_size
        self.seed = seed
        self.world_grid = WorldGrid(chunk_size)
        self.components: list[IWorldComponent] = []
        self.influence_maps: dict[str, InfluenceMap] = {}

        # Standardkomponenten hinzufügen
        self.add_component(TerrainGeneratorComponent(seed=self.seed))
        self.add_component(BiomeGeneratorComponent(seed=self.seed))
        self.add_component(ObjectPlacementComponent(seed=self.seed))

    def add_component(self, component: IWorldComponent):
        """Fügt eine Generierungskomponente hinzu."""
        self.components.append(component)

    def add_influence_map(self, influence_map: InfluenceMap):
        """Fügt eine Einflusskarte hinzu."""
        self.influence_maps[influence_map.name] = influence_map

    def generate_world_chunk(self, world_x: int, world_y: int) -> WorldChunk:
        """
        Generiert einen Chunk an den angegebenen Weltkoordinaten, indem alle
        registrierten Komponenten angewendet werden.
        """
        chunk_x_offset = (world_x // self.chunk_size) * self.chunk_size
        chunk_y_offset = (world_y // self.chunk_size) * self.chunk_size

        chunk = self.world_grid.get_chunk(chunk_x_offset, chunk_y_offset)

        # Wende jede Komponente an, um den Chunk zu generieren
        for component in self.components:
            component.generate_chunk_data(chunk, self.world_grid, self.influence_maps)

        return chunk


# --- Flask Web API ---

app = Flask(__name__)
CORS(app)  # Ermöglicht Cross-Origin-Requests vom Frontend

# Globaler Weltgenerator
world_generator = None

@app.route('/api/init', methods=['POST'])
def init_world_generator():
    """Initialisiert einen neuen Weltgenerator mit den gegebenen Parametern."""
    global world_generator
    
    data = request.get_json()
    chunk_size = data.get('chunk_size', 16)
    seed = data.get('seed', 42)
    
    world_generator = WorldGenerator(chunk_size=chunk_size, seed=seed)
    
    return jsonify({
        'status': 'success',
        'message': f'Weltgenerator initialisiert mit chunk_size={chunk_size}, seed={seed}'
    })

@app.route('/api/generate_chunk', methods=['POST'])
def generate_chunk():
    """Generiert einen Chunk an den angegebenen Weltkoordinaten."""
    global world_generator
    
    if world_generator is None:
        return jsonify({'error': 'Weltgenerator nicht initialisiert. Rufen Sie zuerst /api/init auf.'}), 400
    
    data = request.get_json()
    world_x = data.get('world_x', 0)
    world_y = data.get('world_y', 0)
    
    try:
        chunk = world_generator.generate_world_chunk(world_x, world_y)
        return jsonify({
            'status': 'success',
            'chunk': chunk.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/add_influence_map', methods=['POST'])
def add_influence_map():
    """Fügt eine Einflusskarte zum Weltgenerator hinzu."""
    global world_generator
    
    if world_generator is None:
        return jsonify({'error': 'Weltgenerator nicht initialisiert. Rufen Sie zuerst /api/init auf.'}), 400
    
    data = request.get_json()
    name = data.get('name')
    influence_data = data.get('data', {})
    default_value = data.get('default_value', 0.0)
    
    # Konvertiere String-Keys zu Tupeln
    converted_data = {}
    for key, value in influence_data.items():
        if isinstance(key, str) and ',' in key:
            # Format: "x,y"
            x, y = map(int, key.split(','))
            converted_data[(x, y)] = value
        elif isinstance(key, list) and len(key) == 2:
            # Format: [x, y]
            converted_data[(key[0], key[1])] = value
    
    influence_map = InfluenceMap(name=name, data=converted_data, default_value=default_value)
    world_generator.add_influence_map(influence_map)
    
    return jsonify({
        'status': 'success',
        'message': f'Einflusskarte "{name}" hinzugefügt mit {len(converted_data)} Datenpunkten'
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """Gibt den aktuellen Status des Weltgenerators zurück."""
    global world_generator
    
    if world_generator is None:
        return jsonify({
            'initialized': False,
            'message': 'Weltgenerator nicht initialisiert'
        })
    
    return jsonify({
        'initialized': True,
        'chunk_size': world_generator.chunk_size,
        'seed': world_generator.seed,
        'components_count': len(world_generator.components),
        'influence_maps_count': len(world_generator.influence_maps),
        'loaded_chunks_count': len(world_generator.world_grid._loaded_chunks)
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Einfacher Health-Check-Endpunkt."""
    return jsonify({'status': 'healthy', 'service': 'world-generator'})

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    app.run(host='0.0.0.0', port=5001, debug=True)
