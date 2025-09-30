using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Threading;

namespace GameEngineService.Models
{
    #region Interfaces
    public interface ILifeCycleModule
    {
        Task LoadAssetsAsync();
        Task UnloadAssetsAsync();
        void Pause();
        void Resume();
        void OnDestroy();
    }

    public interface IGameModule : ILifeCycleModule
    {
        string ModuleId { get; }
        string ModuleName { get; }
        void OnActivate(GameContext context);
        void OnDeactivate(GameContext context);
        void Update(float deltaTime);
        void Render();
        void ProcessInput(InputState input);
    }

    public interface IGameService { }

    public interface IRenderService : IGameService
    {
        void RenderScene();
        string GetRenderOutput();
    }

    public interface IAudioService : IGameService
    {
        void PlaySound(string soundId);
    }

    public interface IInputService : IGameService
    {
        InputState GetInput();
    }

    public interface ISaveLoadService : IGameService
    {
        Task SaveAsync(GameContext context);
        Task<GameContext> LoadAsync();
    }
    #endregion

    #region GameContext
    public class GameContext
    {
        public PlayerProfile Player { get; set; } = new PlayerProfile();
        public GlobalInventory GlobalInventory { get; set; } = new GlobalInventory();
        public PersistentWorldState WorldState { get; set; } = new PersistentWorldState();
        public EventBus EventBus { get; set; } = new EventBus();
        public Dictionary<string, object> CustomData { get; set; } = new Dictionary<string, object>();
    }

    public class PlayerProfile 
    {
        public string PlayerId { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = "Player";
        public int Level { get; set; } = 1;
        public Dictionary<string, object> Stats { get; set; } = new Dictionary<string, object>();
    }

    public class GlobalInventory 
    {
        public Dictionary<string, int> Items { get; set; } = new Dictionary<string, int>();
        public int Currency { get; set; } = 0;
    }

    public class PersistentWorldState 
    {
        public Dictionary<string, object> WorldData { get; set; } = new Dictionary<string, object>();
        public DateTime LastSaved { get; set; } = DateTime.UtcNow;
    }

    public class InputState 
    {
        public Dictionary<string, bool> Keys { get; set; } = new Dictionary<string, bool>();
        public Dictionary<string, float> Axes { get; set; } = new Dictionary<string, float>();
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
    #endregion

    #region EventBus
    public class EventBus
    {
        private readonly Dictionary<Type, List<Func<object, Task>>> _subscribers = new();

        public void Subscribe<T>(Func<T, Task> handler)
        {
            Type type = typeof(T);
            if (!_subscribers.ContainsKey(type)) _subscribers[type] = new List<Func<object, Task>>();
            _subscribers[type].Add(async (obj) => await handler((T)obj));
        }

        public void Unsubscribe<T>(Func<T, Task> handler)
        {
            Type type = typeof(T);
            if (_subscribers.ContainsKey(type)) _subscribers[type].Remove(async (obj) => await handler((T)obj));
        }

        public async Task Publish<T>(T evt)
        {
            Type type = typeof(T);
            if (_subscribers.ContainsKey(type))
            {
                foreach (var handler in _subscribers[type]) await handler(evt);
            }
        }
    }
    #endregion

    #region ServiceLocator
    public class ServiceLocator
    {
        private readonly Dictionary<Type, IGameService> _services = new();

        public void Register<T>(T service) where T : IGameService => _services[typeof(T)] = service;
        public T Get<T>() where T : IGameService => (T)_services[typeof(T)];
        public bool HasService<T>() where T : IGameService => _services.ContainsKey(typeof(T));
    }
    #endregion

    #region GameEngine
    public class GameEngine
    {
        private readonly Dictionary<string, IGameModule> _modules = new();
        private IGameModule _activeModule;
        private GameContext _context = new();
        private readonly ServiceLocator _serviceLocator = new();
        private bool _isRunning = false;
        private CancellationTokenSource _cancellationTokenSource;

        public ServiceLocator Services => _serviceLocator;
        public GameContext Context => _context;
        public IGameModule ActiveModule => _activeModule;
        public bool IsRunning => _isRunning;

        public void RegisterModule(IGameModule module)
        {
            _modules[module.ModuleId] = module;
            module.LoadAssetsAsync().Wait();
        }

        public bool ActivateModule(string moduleId)
        {
            if (_modules.TryGetValue(moduleId, out var module))
            {
                _activeModule?.OnDeactivate(_context);
                _activeModule = module;
                _activeModule.OnActivate(_context);
                return true;
            }
            return false;
        }

        public void Start()
        {
            _isRunning = true;
            _cancellationTokenSource = new CancellationTokenSource();
            Task.Run(() => RunGameLoop(_cancellationTokenSource.Token));
        }

        public void Stop()
        {
            _isRunning = false;
            _cancellationTokenSource?.Cancel();
        }

        public void Pause() => _activeModule?.Pause();
        public void Resume() => _activeModule?.Resume();

        public List<string> GetAvailableModules()
        {
            return new List<string>(_modules.Keys);
        }

        public Dictionary<string, object> GetEngineStatus()
        {
            return new Dictionary<string, object>
            {
                ["isRunning"] = _isRunning,
                ["activeModule"] = _activeModule?.ModuleName ?? "None",
                ["availableModules"] = GetAvailableModules(),
                ["servicesCount"] = _serviceLocator.HasService<IRenderService>() ? 1 : 0
            };
        }

        private async Task RunGameLoop(CancellationToken cancellationToken)
        {
            try
            {
                const float fixedDeltaTime = 0.016f; // 60 FPS logic
                while (_isRunning && !cancellationToken.IsCancellationRequested)
                {
                    if (_serviceLocator.HasService<IInputService>())
                    {
                        var input = _serviceLocator.Get<IInputService>().GetInput();
                        _activeModule?.ProcessInput(input);
                    }

                    _activeModule?.Update(fixedDeltaTime);

                    if (_serviceLocator.HasService<IRenderService>())
                    {
                        _serviceLocator.Get<IRenderService>().RenderScene();
                    }

                    _activeModule?.Render();

                    await Task.Delay(16, cancellationToken); // simple frame sync
                }
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fatal error in GameLoop: {ex.Message}");
                Stop();
            }
        }
    }
    #endregion

    #region Example Modules
    public class CoreHubModule : IGameModule
    {
        public string ModuleId => "CORE_HUB";
        public string ModuleName => "Core Hub";
        private List<string> _renderOutput = new List<string>();

        public Task LoadAssetsAsync() => Task.CompletedTask;
        public Task UnloadAssetsAsync() => Task.CompletedTask;
        public void Pause() { }
        public void Resume() { }
        public void OnDestroy() { }

        public void OnActivate(GameContext context)
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] Core Hub Activated");
            Console.WriteLine("Core Hub Activated");
        }

        public void OnDeactivate(GameContext context)
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] Core Hub Deactivated");
            Console.WriteLine("Core Hub Deactivated");
        }

        public void Update(float deltaTime)
        {
            // Simulate some hub activity
        }

        public void Render()
        {
            // Add render output for web display
        }

        public void ProcessInput(InputState input) { }

        public List<string> GetRenderOutput() => new List<string>(_renderOutput);
    }

    public class EgoShooterModule : IGameModule
    {
        public string ModuleId => "FPS_ARENA";
        public string ModuleName => "Ego-Shooter Arena";
        private List<string> _renderOutput = new List<string>();

        public Task LoadAssetsAsync() => Task.CompletedTask;
        public Task UnloadAssetsAsync() => Task.CompletedTask;
        public void Pause() { }
        public void Resume() { }
        public void OnDestroy() { }

        public void OnActivate(GameContext context)
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] FPS Arena Activated - Loading weapons...");
            Console.WriteLine("FPS Arena Activated");
        }

        public void OnDeactivate(GameContext context)
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] FPS Arena Deactivated");
            Console.WriteLine("FPS Arena Deactivated");
        }

        public void Update(float deltaTime)
        {
            // Simulate FPS game logic
        }

        public void Render()
        {
            // Add render output for web display
        }

        public void ProcessInput(InputState input) { }

        public List<string> GetRenderOutput() => new List<string>(_renderOutput);
    }

    public class VoxelWorldModule : IGameModule
    {
        public string ModuleId => "VOXEL_WORLD";
        public string ModuleName => "Voxel Craft & Build";
        private List<string> _renderOutput = new List<string>();

        public Task LoadAssetsAsync() => Task.CompletedTask;
        public Task UnloadAssetsAsync() => Task.CompletedTask;
        public void Pause() { }
        public void Resume() { }
        public void OnDestroy() { }

        public void OnActivate(GameContext context)
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] Voxel World Activated - Generating terrain...");
            Console.WriteLine("Voxel World Activated");
        }

        public void OnDeactivate(GameContext context)
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] Voxel World Deactivated");
            Console.WriteLine("Voxel World Deactivated");
        }

        public void Update(float deltaTime)
        {
            // Simulate voxel world logic
        }

        public void Render()
        {
            // Add render output for web display
        }

        public void ProcessInput(InputState input) { }

        public List<string> GetRenderOutput() => new List<string>(_renderOutput);
    }

    public class BattleRoyaleModule : IGameModule
    {
        public string ModuleId => "BR_ISLAND";
        public string ModuleName => "Battle Royale Island";
        private List<string> _renderOutput = new List<string>();

        public Task LoadAssetsAsync() => Task.CompletedTask;
        public Task UnloadAssetsAsync() => Task.CompletedTask;
        public void Pause() { }
        public void Resume() { }
        public void OnDestroy() { }

        public void OnActivate(GameContext context)
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] Battle Royale Activated - 100 players dropping...");
            Console.WriteLine("Battle Royale Activated");
        }

        public void OnDeactivate(GameContext context)
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] Battle Royale Deactivated");
            Console.WriteLine("Battle Royale Deactivated");
        }

        public void Update(float deltaTime)
        {
            // Simulate battle royale logic
        }

        public void Render()
        {
            // Add render output for web display
        }

        public void ProcessInput(InputState input) { }

        public List<string> GetRenderOutput() => new List<string>(_renderOutput);
    }
    #endregion

    #region Service Implementations
    public class WebRenderService : IRenderService
    {
        private List<string> _renderOutput = new List<string>();

        public void RenderScene()
        {
            _renderOutput.Add($"[{DateTime.Now:HH:mm:ss}] Scene rendered");
        }

        public string GetRenderOutput()
        {
            return string.Join("\n", _renderOutput.TakeLast(10));
        }
    }

    public class WebInputService : IInputService
    {
        public InputState GetInput() => new InputState();
    }

    public class WebAudioService : IAudioService
    {
        public void PlaySound(string soundId)
        {
            Console.WriteLine($"Playing sound: {soundId}");
        }
    }

    public class WebSaveLoadService : ISaveLoadService
    {
        public Task SaveAsync(GameContext context) => Task.CompletedTask;
        public Task<GameContext> LoadAsync() => Task.FromResult(new GameContext());
    }
    #endregion
}
