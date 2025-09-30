using Microsoft.AspNetCore.Mvc;
using GameEngineService.Models;
using System.Text.Json;

namespace GameEngineService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GameEngineController : ControllerBase
    {
        private static GameEngine _gameEngine;
        private static readonly object _lock = new object();

        static GameEngineController()
        {
            InitializeGameEngine();
        }

        private static void InitializeGameEngine()
        {
            lock (_lock)
            {
                if (_gameEngine == null)
                {
                    _gameEngine = new GameEngine();

                    // Register services
                    _gameEngine.Services.Register<IRenderService>(new WebRenderService());
                    _gameEngine.Services.Register<IInputService>(new WebInputService());
                    _gameEngine.Services.Register<IAudioService>(new WebAudioService());
                    _gameEngine.Services.Register<ISaveLoadService>(new WebSaveLoadService());

                    // Register modules
                    _gameEngine.RegisterModule(new CoreHubModule());
                    _gameEngine.RegisterModule(new EgoShooterModule());
                    _gameEngine.RegisterModule(new VoxelWorldModule());
                    _gameEngine.RegisterModule(new BattleRoyaleModule());

                    // Activate starting module
                    _gameEngine.ActivateModule("CORE_HUB");
                }
            }
        }

        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new { status = "healthy", service = "game-engine" });
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            var status = _gameEngine.GetEngineStatus();
            return Ok(status);
        }

        [HttpPost("start")]
        public IActionResult StartEngine()
        {
            try
            {
                if (!_gameEngine.IsRunning)
                {
                    _gameEngine.Start();
                    return Ok(new { status = "success", message = "Game engine started" });
                }
                return Ok(new { status = "info", message = "Game engine already running" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("stop")]
        public IActionResult StopEngine()
        {
            try
            {
                _gameEngine.Stop();
                return Ok(new { status = "success", message = "Game engine stopped" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("pause")]
        public IActionResult PauseEngine()
        {
            try
            {
                _gameEngine.Pause();
                return Ok(new { status = "success", message = "Game engine paused" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("resume")]
        public IActionResult ResumeEngine()
        {
            try
            {
                _gameEngine.Resume();
                return Ok(new { status = "success", message = "Game engine resumed" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("modules")]
        public IActionResult GetAvailableModules()
        {
            var modules = _gameEngine.GetAvailableModules();
            return Ok(new { modules });
        }

        [HttpPost("modules/{moduleId}/activate")]
        public IActionResult ActivateModule(string moduleId)
        {
            try
            {
                bool success = _gameEngine.ActivateModule(moduleId);
                if (success)
                {
                    return Ok(new { status = "success", message = $"Module '{moduleId}' activated" });
                }
                return NotFound(new { error = $"Module '{moduleId}' not found" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("context")]
        public IActionResult GetGameContext()
        {
            try
            {
                var context = _gameEngine.Context;
                var contextData = new
                {
                    player = new
                    {
                        playerId = context.Player.PlayerId,
                        name = context.Player.Name,
                        level = context.Player.Level,
                        stats = context.Player.Stats
                    },
                    inventory = new
                    {
                        items = context.GlobalInventory.Items,
                        currency = context.GlobalInventory.Currency
                    },
                    worldState = new
                    {
                        lastSaved = context.WorldState.LastSaved,
                        dataCount = context.WorldState.WorldData.Count
                    },
                    customData = context.CustomData
                };
                return Ok(contextData);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("context/player")]
        public IActionResult UpdatePlayer([FromBody] JsonElement playerData)
        {
            try
            {
                var context = _gameEngine.Context;
                
                if (playerData.TryGetProperty("name", out var nameElement))
                {
                    context.Player.Name = nameElement.GetString() ?? context.Player.Name;
                }
                
                if (playerData.TryGetProperty("level", out var levelElement))
                {
                    context.Player.Level = levelElement.GetInt32();
                }

                return Ok(new { status = "success", message = "Player data updated" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("context/inventory/add")]
        public IActionResult AddInventoryItem([FromBody] JsonElement itemData)
        {
            try
            {
                var context = _gameEngine.Context;
                
                if (itemData.TryGetProperty("item", out var itemElement) && 
                    itemData.TryGetProperty("quantity", out var quantityElement))
                {
                    string itemName = itemElement.GetString() ?? "";
                    int quantity = quantityElement.GetInt32();
                    
                    if (context.GlobalInventory.Items.ContainsKey(itemName))
                    {
                        context.GlobalInventory.Items[itemName] += quantity;
                    }
                    else
                    {
                        context.GlobalInventory.Items[itemName] = quantity;
                    }

                    return Ok(new { status = "success", message = $"Added {quantity} {itemName} to inventory" });
                }
                
                return BadRequest(new { error = "Invalid item data" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("input")]
        public IActionResult SendInput([FromBody] JsonElement inputData)
        {
            try
            {
                var inputState = new InputState();
                
                if (inputData.TryGetProperty("keys", out var keysElement))
                {
                    foreach (var keyProperty in keysElement.EnumerateObject())
                    {
                        inputState.Keys[keyProperty.Name] = keyProperty.Value.GetBoolean();
                    }
                }
                
                if (inputData.TryGetProperty("axes", out var axesElement))
                {
                    foreach (var axisProperty in axesElement.EnumerateObject())
                    {
                        inputState.Axes[axisProperty.Name] = (float)axisProperty.Value.GetDouble();
                    }
                }

                _gameEngine.ActiveModule?.ProcessInput(inputState);
                
                return Ok(new { status = "success", message = "Input processed" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("render")]
        public IActionResult GetRenderOutput()
        {
            try
            {
                var renderService = _gameEngine.Services.Get<IRenderService>() as WebRenderService;
                var output = renderService?.GetRenderOutput() ?? "No render output available";
                
                return Ok(new { renderOutput = output });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
