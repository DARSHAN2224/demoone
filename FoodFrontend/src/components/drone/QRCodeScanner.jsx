import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';

const QRCodeScanner = ({ drone, onQRScanned }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'manual'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleManualScan = () => {
    if (!manualInput.trim()) {
      setError('Please enter QR code data');
      return;
    }

    try {
      const parsedData = parseQRData(manualInput);
      if (parsedData) {
        processScannedData(parsedData);
        setManualInput('');
      } else {
        setError('Invalid QR code format');
      }
    } catch (error) {
      setError('Failed to process QR code data');
    }
  };

  const parseQRData = (data) => {
    try {
      // Try to parse as JSON first
      if (data.startsWith('{') || data.startsWith('[')) {
        return JSON.parse(data);
      }
      
      // Try to parse as URL-encoded data
      if (data.includes('=')) {
        const params = new URLSearchParams(data);
        const result = {};
        for (const [key, value] of params) {
          result[key] = value;
        }
        return result;
      }
      
      // Try to parse as comma-separated values
      if (data.includes(',')) {
        const parts = data.split(',');
        if (parts.length >= 3) {
          return {
            type: 'coordinates',
            lat: parseFloat(parts[0]),
            lng: parseFloat(parts[1]),
            altitude: parseFloat(parts[2]),
            timestamp: parts[3] || Date.now()
          };
        }
      }
      
      // Return as plain text
      return {
        type: 'text',
        content: data,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('QR parsing error:', error);
      return null;
    }
  };

  const processScannedData = (data) => {
    const scanResult = {
      id: Date.now(),
      timestamp: new Date(),
      data: data,
      droneId: drone?._id,
      status: 'success'
    };

    setScannedData(data);
    setScanHistory(prev => [scanResult, ...prev.slice(0, 9)]); // Keep last 10
    setSuccess('QR code scanned successfully!');
    setError(null);

    // Notify parent component
    if (onQRScanned) {
      onQRScanned(data);
    }

    // Auto-clear success message
    setTimeout(() => setSuccess(null), 3000);
  };

  const clearHistory = () => {
    setScanHistory([]);
    setScannedData(null);
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(scanHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-scan-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getDataDisplay = (data) => {
    if (!data) return null;

    switch (data.type) {
      case 'delivery':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Order ID:</span>
              <span>{data.orderId}</span>
              <span className="font-medium">Customer:</span>
              <span>{data.customerName}</span>
              <span className="font-medium">Address:</span>
              <span>{data.deliveryAddress}</span>
              <span className="font-medium">Status:</span>
              <Badge variant="outline">{data.status}</Badge>
            </div>
          </div>
        );
      
      case 'coordinates':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Latitude:</span>
              <span>{data.lat.toFixed(6)}</span>
              <span className="font-medium">Longitude:</span>
              <span>{data.lng.toFixed(6)}</span>
              <span className="font-medium">Altitude:</span>
              <span>{data.altitude}m</span>
              <span className="font-medium">Timestamp:</span>
              <span>{new Date(data.timestamp).toLocaleString()}</span>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Content:</span>
              <p className="mt-1 p-2 bg-gray-50 rounded border">{data.content}</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-sm">
            <pre className="p-2 bg-gray-50 rounded border overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <QrCode className="h-5 w-5" />
              <span>QR Code Scanner</span>
            </span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={scanMode === 'camera' ? 'default' : 'outline'}
                onClick={() => setScanMode('camera')}
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </Button>
              <Button
                size="sm"
                variant={scanMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setScanMode('manual')}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Manual
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scanMode === 'camera' ? (
            <div className="space-y-4">
              {/* Camera View */}
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg"
                  autoPlay
                  playsInline
                  muted
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 rounded-lg">
                    <div className="text-center text-white">
                      <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-semibold">Camera Ready</p>
                      <p className="text-sm opacity-75">Click start to begin scanning</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex justify-center space-x-4">
                {!isScanning ? (
                  <Button onClick={startCamera} className="px-8">
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="destructive" className="px-8">
                    <XCircle className="w-4 h-4 mr-2" />
                    Stop Camera
                  </Button>
                )}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Point camera at QR code to scan</p>
                <p>Ensure good lighting and steady hand</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Manual Input */}
              <div>
                <Label htmlFor="manualInput">QR Code Data</Label>
                <div className="flex space-x-2 mt-2">
                  <Input
                    id="manualInput"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter QR code data or paste content here"
                    className="flex-1"
                  />
                  <Button onClick={handleManualScan}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan
                  </Button>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Paste QR code data or manually enter information</p>
                <p>Supports JSON, URL-encoded, and plain text formats</p>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Success:</span>
                <span>{success}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanned Data Display */}
      {scannedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Last Scanned Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getDataDisplay(scannedData)}
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scan History</span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={clearHistory}
                disabled={scanHistory.length === 0}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportHistory}
                disabled={scanHistory.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scanHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="h-16 w-16 mx-auto mb-4" />
              <p>No scan history available</p>
              <p className="text-sm">Scanned QR codes will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scanHistory.map((scan) => (
                <div key={scan.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">
                        {scan.data.type ? scan.data.type.toUpperCase() : 'UNKNOWN'} QR Code
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {scan.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {scan.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {scan.data.type === 'delivery' && (
                      <span>Order: {scan.data.orderId}</span>
                    )}
                    {scan.data.type === 'coordinates' && (
                      <span>
                        Location: {scan.data.lat.toFixed(4)}, {scan.data.lng.toFixed(4)}
                      </span>
                    )}
                    {scan.data.type === 'text' && (
                      <span>Content: {scan.data.content.substring(0, 50)}...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Usage Instructions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">1.</span>
              <span>Use camera mode to scan physical QR codes or manual mode to input data</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">2.</span>
              <span>Supported formats: JSON, URL-encoded parameters, coordinates, plain text</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">3.</span>
              <span>Scanned data is automatically processed and can trigger drone actions</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">4.</span>
              <span>Scan history is maintained for verification and audit purposes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRCodeScanner;
