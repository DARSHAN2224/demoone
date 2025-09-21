import argparse
import os
import sys

def ensure_dir(path: str):
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)

def main():
    parser = argparse.ArgumentParser(description='Convert PX4 ULog to plots (PNG).')
    parser.add_argument('--input', required=True, help='Path to .ulg file')
    parser.add_argument('--output', required=True, help='Directory to write plots')
    args = parser.parse_args()

    ensure_dir(args.output)

    # Lazy import so script can show clear error if deps missing
    try:
        from pyulog import ULog
        import pandas as pd
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
    except Exception as e:
        sys.stderr.write(f"Dependency error: {e}\nInstall with: pip install pyulog pandas matplotlib\n")
        sys.exit(2)

    # Parse ULog
    ulog = ULog(args.input)

    def save_plot(fig, name):
        out_path = os.path.join(args.output, name)
        fig.savefig(out_path, bbox_inches='tight')
        plt.close(fig)

    # Altitude vs time (vehicle_local_position)
    try:
        d = ulog.get_dataset('vehicle_local_position')
        t = d.data['timestamp'] / 1e6
        z = d.data['z']
        fig, ax = plt.subplots(figsize=(10,4))
        ax.plot(t, -z)  # PX4 z-down, invert for altitude up
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('Altitude (m)')
        ax.set_title('Altitude vs Time')
        save_plot(fig, 'altitude.png')
    except Exception:
        pass

    # Battery vs time (battery_status)
    try:
        d = ulog.get_dataset('battery_status')
        t = d.data['timestamp'] / 1e6
        remaining = d.data.get('remaining', None)
        if remaining is not None:
            percent = remaining * 100.0
            fig, ax = plt.subplots(figsize=(10,4))
            ax.plot(t, percent)
            ax.set_xlabel('Time (s)')
            ax.set_ylabel('Battery (%)')
            ax.set_title('Battery vs Time')
            save_plot(fig, 'battery.png')
    except Exception:
        pass

    # Velocity vs time (vehicle_local_position or vehicle_local_velocity)
    try:
        try:
            d = ulog.get_dataset('vehicle_local_velocity')
            t = d.data['timestamp'] / 1e6
            vx, vy, vz = d.data['vx'], d.data['vy'], d.data['vz']
        except Exception:
            d = ulog.get_dataset('vehicle_local_position')
            t = d.data['timestamp'] / 1e6
            vx, vy, vz = d.data['vx'], d.data['vy'], d.data['vz']
        speed = (vx**2 + vy**2 + vz**2) ** 0.5
        fig, ax = plt.subplots(figsize=(10,4))
        ax.plot(t, speed)
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('Speed (m/s)')
        ax.set_title('Speed vs Time')
        save_plot(fig, 'velocity.png')
    except Exception:
        pass

    # Trajectory X-Y (vehicle_local_position)
    try:
        d = ulog.get_dataset('vehicle_local_position')
        x = d.data['x']
        y = d.data['y']
        fig, ax = plt.subplots(figsize=(6,6))
        ax.plot(x, y)
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)')
        ax.set_title('Local Trajectory')
        ax.axis('equal')
        save_plot(fig, 'trajectory.png')
    except Exception:
        pass

    print('Plots generated')

if __name__ == '__main__':
    main()


