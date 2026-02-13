import sys
import os

# Add current dir to sys.path
sys.path.append(os.getcwd())

try:
    import models
    print("Found names in models:", [name for name in dir(models) if 'PointsRequest' in name])
    
    # Try to import AwardPointsRequest
    try:
        from models import AwardPointsRequest
        print("Successfully imported AwardPointsRequest")
    except ImportError as e:
        print("ImportError for AwardPointsRequest:", e)
        
    print("AwardPointsRequest status in sys.modules['models']:", hasattr(models, 'AwardPointsRequest'))

except Exception as e:
    print("Error during models import test:", e)
