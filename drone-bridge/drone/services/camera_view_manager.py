# drone/services/camera_view_manager.py
import asyncio
import cv2
import numpy as np
import airsim
import logging

log = logging.getLogger("camera_views")

class CameraViewManager:
    def __init__(self, airsim_client):
        self.client = airsim_client
        self.is_running = False
        self.view_tasks = []
        self.camera_names = ["0", "1", "2"] # 0=Front, 1=Bottom, 2=Back

    async def start_viewing(self):
        """Starts the live display for all cameras."""
        if self.is_running:
            log.warning("Camera views are already running.")
            return

        log.info("Starting AirSim camera views (mini windows)...")
        self.is_running = True
        
        # Create a separate background task for each camera view.
        for name in self.camera_names:
            task = asyncio.create_task(self._camera_loop(name))
            self.view_tasks.append(task)

    async def stop_viewing(self):
        """Stops all active camera view tasks and closes windows."""
        if not self.is_running:
            log.info("Camera views are not running.")
            return

        log.info("Stopping AirSim camera views...")
        self.is_running = False
        
        # Cancel all running camera tasks.
        for task in self.view_tasks:
            task.cancel()
        
        # Wait for tasks to finish cancelling.
        await asyncio.gather(*self.view_tasks, return_exceptions=True)
        self.view_tasks = []
        
        # This needs to be run in a thread to avoid blocking asyncio loop.
        await asyncio.to_thread(cv2.destroyAllWindows)
        log.info("All camera windows closed.")

    async def _camera_loop(self, camera_name: str):
        """The core loop that fetches and displays images for one camera."""
        window_name = f"AirSim View - Camera {camera_name}"
        
        try:
            while self.is_running:
                # Request the image from AirSim.
                responses = self.client.simGetImages([
                    airsim.ImageRequest(camera_name, airsim.ImageType.Scene, False, False)
                ])
                response = responses[0]
                
                if response and response.image_data_uint8:
                    # Convert image data to an array that OpenCV can use.
                    img1d = np.frombuffer(response.image_data_uint8, dtype=np.uint8)
                    img_rgb = img1d.reshape(response.height, response.width, 3)
                    
                    # Convert RGB (AirSim) to BGR (OpenCV) for correct colors.
                    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
                    
                    # Display the image in a window.
                    cv2.imshow(window_name, img_bgr)
                
                # Allow OpenCV to process GUI events.
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                
                # Yield control to the asyncio event loop.
                await asyncio.sleep(0.05) # 20 FPS
        
        except asyncio.CancelledError:
            log.info(f"Camera view task for '{window_name}' cancelled.")
        except Exception as e:
            log.error(f"Error in camera loop for '{window_name}': {e}")
        finally:
            # Ensure the window is closed when the loop exits.
            if cv2.getWindowProperty(window_name, cv2.WND_PROP_VISIBLE) >= 1:
                cv2.destroyWindow(window_name)
