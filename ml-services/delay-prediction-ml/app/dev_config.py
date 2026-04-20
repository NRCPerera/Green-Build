"""Development configuration"""

import os

# Set DEV_MODE via environment variable or default to False
# When True, uses mock predictions (no models required)
# When False, uses real trained models
DEV_MODE = os.getenv("DEV_MODE", "false").lower() in ("true", "1", "yes")
