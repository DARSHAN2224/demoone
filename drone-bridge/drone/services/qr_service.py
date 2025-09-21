

import asyncio
import cv2
import numpy as np
import qrcode
from pyzbar.pyzbar import decode
from config.config import QR_TEXT_PREFIX, QR_WINDOW_TITLE
import logging

log = logging.getLogger("qr")

class QRService:
    def __init__(self):
        pass

    async def show_and_scan(self, payload_text: str) -> bool:
        """
        Show a QR code to simulate proof and auto-scan it locally.
        """
        data = f"{QR_TEXT_PREFIX}{payload_text}"
        qr_img = qrcode.make(data)
        qr_img_cv = np.array(qr_img.convert('RGB'))
        qr_img_cv = cv2.cvtColor(qr_img_cv, cv2.COLOR_RGB2BGR)
        qr_img_cv = cv2.resize(qr_img_cv, (800, 800), interpolation=cv2.INTER_NEAREST)

        # Add text overlay with better visibility
        cv2.putText(qr_img_cv, "DRONE DELIVERY QR CODE", (50, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)
        cv2.putText(qr_img_cv, f"Order: {payload_text}", (50, 750), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
        cv2.putText(qr_img_cv, "Press any key to continue...", (50, 780), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (128, 128, 128), 2)
        cv2.putText(qr_img_cv, "ESC to cancel", (50, 810), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        log.info(f"📱 Displaying QR code for delivery: {payload_text}")
        
        # Display with user interaction
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, lambda: self._display_interactive(qr_img_cv))
        
        # Check if user pressed ESC (key code 27)
        if result == 27:
            log.info("QR code display cancelled by user")
            return False
        
        # Simulate scan
        await asyncio.sleep(0.5)
        decoded = decode(qr_img_cv)
        if decoded:
            text = decoded[0].data.decode("utf-8")
            log.info(f"✅ QR scan successful: {text}")
            return True
        log.error("❌ QR scan failed")
        return False

    def _display(self, image):
        cv2.imshow(QR_WINDOW_TITLE, image)
        cv2.waitKey(900)  # auto-close after 900ms to keep event loop free
        cv2.destroyAllWindows()

    def _display_interactive(self, image):
        """Display QR code and wait for user interaction"""
        cv2.imshow(QR_WINDOW_TITLE, image)
        key = cv2.waitKey(0) & 0xFF  # Wait for any key press and get key code
        cv2.destroyAllWindows()
        return key
