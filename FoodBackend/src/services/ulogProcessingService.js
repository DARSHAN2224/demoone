import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import DroneLog from '../models/droneLogModel.js';

const REPORTS_DIR = path.join(process.cwd(), 'uploads', 'reports');

function ensureDirectories() {
    const logsDir = path.join(process.cwd(), 'uploads', 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

async function runPythonProcessor(ulgPath, outputDir) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'ulog_to_plots.py');
        const py = spawn('python', [scriptPath, '--input', ulgPath, '--output', outputDir], { stdio: 'pipe' });

        let stdout = '';
        let stderr = '';
        py.stdout.on('data', (d) => stdout += d.toString());
        py.stderr.on('data', (d) => stderr += d.toString());
        py.on('close', (code) => {
            if (code === 0) resolve({ stdout });
            else reject(new Error(stderr || `Python exited with code ${code}`));
        });
    });
}

const ulogProcessingService = {
    async processLog(logId) {
        ensureDirectories();
        const log = await DroneLog.findById(logId);
        if (!log) throw new Error('Log not found');

        const absoluteLogPath = path.isAbsolute(log.path) ? log.path : path.join(process.cwd(), log.path);
        const outputDir = path.join(REPORTS_DIR, log._id.toString());
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        await DroneLog.updateOne({ _id: log._id }, { $set: { 'processing.status': 'processing', 'processing.startedAt': new Date(), 'processing.error': null } });

        try {
            await runPythonProcessor(absoluteLogPath, outputDir);
            // Collect generated files
            const files = fs.readdirSync(outputDir).map(filename => {
                const fpath = path.join(outputDir, filename);
                const stat = fs.statSync(fpath);
                return { filename, path: path.relative(process.cwd(), fpath).replace(/\\/g, '/'), size: stat.size };
            });

            // Map known report types by filename hints
            const reports = files.map(f => ({
                type: f.filename.includes('altitude') ? 'altitude'
                    : f.filename.includes('battery') ? 'battery'
                    : f.filename.includes('velocity') ? 'velocity'
                    : f.filename.includes('trajectory') ? 'trajectory'
                    : 'generic',
                title: f.filename,
                path: `/uploads/${path.relative(path.join(process.cwd(), 'uploads'), path.join(process.cwd(), f.path)).replace(/\\/g, '/')}`,
                size: f.size
            }));

            await DroneLog.updateOne({ _id: log._id }, { $set: { reports, 'processing.status': 'completed', 'processing.completedAt': new Date() } });
            return { success: true, reports };
        } catch (err) {
            await DroneLog.updateOne({ _id: log._id }, { $set: { 'processing.status': 'failed', 'processing.error': err.message, 'processing.completedAt': new Date() } });
            return { success: false, error: err.message };
        }
    }
};

export default ulogProcessingService;


