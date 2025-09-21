import os
import cv2
import asyncio
from config.config import CAPTURE_DIR
import logging

log = logging.getLogger("camera")

try:
    import airsim
except Exception:
    airsim = None

class CameraService:
    def __init__(self, airsim_client):
        """Initialize with shared AirSim client"""
        os.makedirs(CAPTURE_DIR, exist_ok=True)
        self.client = airsim_client
        self.current_camera = 0  # 0=front, 1=bottom, 2=back

    async def capture_delivery_photo(self, drone_id: str, camera_type: str = "front") -> str:
        """
        Capture a scene photo (AirSim) as proof with camera selection.
        """
        timestamp = int(asyncio.get_event_loop().time())
        filename = os.path.join(CAPTURE_DIR, f"{drone_id}_{camera_type}_{timestamp}.jpg")
        
        # Check if the shared client is available
        if not self.client:
            log.warning("AirSim client not available, creating placeholder image.")
            # Create a blank image placeholder
            import numpy as np
            img = 255 * np.ones((480, 640, 3), dtype=np.uint8)
            cv2.putText(img, "NO AIRSIM CONNECTION", (30, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,0,0), 2)
            cv2.putText(img, f"Camera: {camera_type}", (30, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,0), 2)
            cv2.imwrite(filename, img)
            return filename

        # Map camera types to AirSim camera IDs (AirSim uses string names)
        camera_map = {
            "front": "0",      # Front camera
            "bottom": "1",     # Bottom camera  
            "back": "2"        # Back camera
        }
        
        camera_id = camera_map.get(camera_type, "0")
        
        try:
            # Try to get camera info first
            camera_info = self.client.simGetCameraInfo(camera_id)
            log.info(f"Camera {camera_id} info: {camera_info}")
            
            # Capture image
            responses = self.client.simGetImages([
                airsim.ImageRequest(camera_id, airsim.ImageType.Scene, False, False)
            ])
            
            if responses and len(responses) > 0 and responses[0].height > 0:
                response = responses[0]
                # Convert AirSim image data to OpenCV format
                import numpy as np
                img1d = np.frombuffer(response.image_data_uint8, dtype=np.uint8)
                img_rgb = img1d.reshape(response.height, response.width, 3)
                img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
                
                # Add timestamp and camera info overlay
                cv2.putText(img_bgr, f"Camera: {camera_type.upper()}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(img_bgr, f"Drone: {drone_id}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(img_bgr, f"Time: {timestamp}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                cv2.imwrite(filename, img_bgr)
                log.info(f"Photo captured successfully: {filename}")
            else:
                raise Exception("No valid image response from AirSim")
                
        except Exception as e:
            log.error(f"Failed to capture photo from {camera_type} camera: {e}")
            # Create error placeholder with more details
            import numpy as np
            img = 255 * np.ones((480, 640, 3), dtype=np.uint8)
            cv2.putText(img, "CAPTURE ERROR", (150, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,0,255), 2)
            cv2.putText(img, f"Camera: {camera_type}", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,0), 2)
            cv2.putText(img, f"Error: {str(e)[:30]}...", (150, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1)
            cv2.putText(img, "Check AirSim connection", (150, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1)
            cv2.imwrite(filename, img)
            
        return filename

    async def switch_camera(self, camera_type: str):
        """Switch AirSim camera view"""
        if not self.client:
            log.warning("AirSim client not available for camera switching")
            return
            
        camera_map = {
            "front": 0,
            "bottom": 1, 
            "back": 2
        }
        
        if camera_type in camera_map:
            self.current_camera = camera_map[camera_type]
            log.info(f"Switched to {camera_type} camera")
        else:
            log.warning(f"Unknown camera type: {camera_type}")

    async def capture_multiple_angles(self, drone_id: str) -> list:
        """Capture photos from multiple camera angles"""
        photos = []
        for camera_type in ["front", "bottom", "back"]:
            photo_path = await self.capture_delivery_photo(drone_id, camera_type)
            photos.append({"camera": camera_type, "path": photo_path})
        return photos
