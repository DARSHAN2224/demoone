# 📁 Drone Bridge - File Structure Overview

## 🎯 Reorganization Summary

The drone-bridge directory has been reorganized for better maintainability and clarity. Here's what changed:

### ✅ **Before (Messy)**
```
drone-bridge/
├── AirSim/ (huge external dependency)
├── config.py
├── requirements.txt
├── start.py
├── test_*.py (scattered test files)
├── *_CONFIGURATION.md (scattered docs)
├── check_backend.py
├── drone/
├── common/
├── utils/
├── logs/
├── captures/
└── scripts/
```

### ✅ **After (Organized)**
```
drone-bridge/
├── 📁 config/           # All configuration files
├── 📁 docs/             # All documentation
├── 📁 tests/            # All test files
├── 📁 external/         # External dependencies (AirSim)
├── 📁 drone/            # Core drone functionality
├── 📁 common/           # Shared utilities
├── 📁 utils/            # Utility functions
├── 📁 scripts/          # Utility scripts
├── 📁 logs/             # Log files
├── 📁 captures/         # Photo captures
├── 📁 mavsdk-env/       # Python environment
└── start.py             # Main entry point
```

## 📋 **What Was Moved**

### **Configuration Files** → `config/`
- `config.py` → `config/config.py`
- `requirements.txt` → `config/requirements.txt`

### **Documentation** → `docs/`
- `DRONE_CONFIGURATION.md` → `docs/DRONE_CONFIGURATION.md`
- `DYNAMIC_CONFIGURATION.md` → `docs/DYNAMIC_CONFIGURATION.md`
- `TESTING_GUIDE.md` → `docs/TESTING_GUIDE.md`

### **Test Files** → `tests/`
- `test_*.py` → `tests/test_*.py`
- `check_backend.py` → `tests/check_backend.py`

### **External Dependencies** → `external/`
- `AirSim/` → `external/AirSim/`

## 🔧 **Updated Import Paths**

All import statements have been updated to reflect the new structure:

```python
# Before
from config import DRONES, DEFAULT_MODE

# After
from config.config import DRONES, DEFAULT_MODE
```

## 🎉 **Benefits**

1. **🧹 Cleaner Root**: Only essential files in root directory
2. **📚 Organized Docs**: All documentation in one place
3. **🧪 Test Suite**: Dedicated test directory
4. **⚙️ Config Centralized**: All configuration in one folder
5. **🔗 External Isolated**: External dependencies separated
6. **📖 Better Navigation**: Easy to find what you need

## 🚀 **Usage**

The reorganization doesn't change how you use the drone bridge:

```bash
# Still works the same way
cd drone-bridge
python start.py

# Tests are now in tests/ directory
python tests/test_integration.py

# Configuration is still in main .env file
# (no changes needed)
```

## 📝 **File Locations**

| **Purpose** | **Location** | **Files** |
|-------------|--------------|-----------|
| **Configuration** | `config/` | `config.py`, `requirements.txt` |
| **Documentation** | `docs/` | All `.md` files |
| **Tests** | `tests/` | All `test_*.py` files |
| **External** | `external/` | `AirSim/` directory |
| **Core Code** | `drone/` | Main drone functionality |
| **Utilities** | `utils/` | Utility functions |
| **Scripts** | `scripts/` | PowerShell scripts |
| **Logs** | `logs/` | All log files |
| **Captures** | `captures/` | Photo captures |

---

The reorganization makes the codebase much more maintainable and professional! 🎯
