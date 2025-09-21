# =================================================================
# PowerShell Script to Test the Drone Delivery Fleet API
# =================================================================
# This script dynamically discovers and controls drones by communicating
# with a central backend server, which routes commands to the fleet.
# =================================================================

# --- Configuration ---
$BackendBaseUrl = "http://localhost:8000/api/v1/test/drone"
$TakeoffAltitude = 20

# The list of drones is now discovered from the backend.
$DiscoveredDrones = @{}

# --- UI Helper Functions ---
function Show-Title {
    param($Title, $Subtitle)
    Clear-Host
    Write-Host "
 ========================================" -ForegroundColor Cyan
    Write-Host "   $Title" -ForegroundColor Yellow
    if ($Subtitle) { Write-Host "   $Subtitle" -ForegroundColor DarkGray }
    Write-Host "=========================================" -ForegroundColor Cyan
}

function Show-Result {
    param($Success, $Message)
    if ($Success) { Write-Host " $Message" -ForegroundColor Green }
    else { Write-Host " $Message" -ForegroundColor Red }
}

# --- Dynamic Drone Discovery ---
function Get-DiscoveredDrones {
    Write-Host "
 Discovering available drones from backend..." -ForegroundColor Gray
    
    try {
        $headers = @{ 'x-test-mode' = 'true' }
        $response = Invoke-RestMethod -Uri "$BackendBaseUrl/fleet/discover" -Method Get -Headers $headers -TimeoutSec 10 -ErrorAction Stop
        
        if ($response.success) {
            $DiscoveredDrones.Clear()
            foreach ($drone in $response.data.drones) {
                $DiscoveredDrones[$drone.id] = @{
                    Port      = $drone.port
                    Available = $drone.available
                    Status    = $drone.status
                }
            }
            Show-Result $true "Discovered $($DiscoveredDrones.Count) configured drones."
            return $true
        } else {
            Show-Result $false "Discovery failed: $($response.message)"
            return $false
        }
    } catch {
        Show-Result $false "Discovery error: Could not connect to backend. Is it running? ($($_.Exception.Message))"
        return $false
    }
}

function Test-DroneConnection {
    param([string]$DroneId)
    if (-not $DiscoveredDrones.ContainsKey($DroneId)) { return $false }
    return $DiscoveredDrones[$DroneId].Available
}

function Select-Drones {
    Show-Title "Select Drone(s) to Command"
    
    if (-not (Get-DiscoveredDrones)) {
        Write-Host "
Check if your Node.js backend and Python drone bridges are running." -ForegroundColor Yellow
        return @()
    }
    
    $availableDrones = @()
    $droneArray = @($DiscoveredDrones.Keys | Sort-Object)
    
    for ($i = 0; $i -lt $droneArray.Length; $i++) {
        $droneId = $droneArray[$i]
        $droneInfo = $DiscoveredDrones[$droneId]
        $statusText = if ($droneInfo.Available) { "[ONLINE]" } else { "[OFFLINE]" }
        $statusColor = if ($droneInfo.Available) { "Green" } else { "Red" }
        Write-Host (" {0}. {1} - {2} (Port: {3})" -f ($i + 1), $droneId, $statusText, $droneInfo.Port) -ForegroundColor $statusColor
        if ($droneInfo.Available) { $availableDrones += $droneId }
    }
    
    $allAvailableIndex = $droneArray.Length + 1
    $allIndex = $droneArray.Length + 2
    
    Write-Host "
--- Group Selections ---"
    
    Write-Host " $($allAvailableIndex). ALL ONLINE Drones ($($availableDrones.Count) active)" -ForegroundColor Magenta
    Write-Host " $($allIndex). ALL CONFIGURED Drones ($($droneArray.Length) total)" -ForegroundColor DarkYellow
    
    Write-Host " Q. Quit" -ForegroundColor Red

    $choice = Read-Host "
Enter your choice"
    
    if ($choice -eq 'q') { return $null }
    
    if ($choice -eq $allAvailableIndex) {
        if ($availableDrones.Count -eq 0) { Write-Host "
 No drones are online." -ForegroundColor Red; return @() }
        return $availableDrones
    }
    
    if ($choice -eq $allIndex) { return $droneArray }
    
    if (($choice -match "^\d+$") -and ($choice -ge 1) -and ($choice -le $droneArray.Length)) {
        return @($droneArray[$choice - 1])
    }
    
    Write-Host "
 Invalid selection." -ForegroundColor Red
    return @()
}

# --- Core API & Command Functions ---
function Invoke-BackendCommand {
    param([string]$DroneId, [string]$Command, [hashtable]$Parameters)
    if ($Command -ne "get_status" -and -not (Test-DroneConnection -DroneId $DroneId)) {
        Show-Result $false "Command '$Command' skipped for $DroneId because it is [OFFLINE]."
        return
    }
    $url = "$BackendBaseUrl/command"
    $body = @{ droneId = $DroneId; command = $Command; parameters = $Parameters } | ConvertTo-Json -Depth 5
    try {
        $headers = @{ 'x-test-mode' = 'true' }
        $response = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Headers $headers -Body $body -TimeoutSec 10
        if ($response.success) {
            Show-Result $true "Command '$Command' sent to $DroneId. Backend says: $($response.message)"
        } else {
            Show-Result $false "Command '$Command' to $DroneId failed. Backend says: $($response.message)"
        }
    } catch {
        Show-Result $false "Command '$Command' to $DroneId failed with an HTTP error: $($_.Exception.Message)"
    }
}

# --- Command Implementation Functions ---
function Get-DroneStatus($droneIds) { 
    foreach ($d in $droneIds) { 
        Write-Host "`nGetting status for $d..." -ForegroundColor Cyan
        $url = "$BackendBaseUrl/command"
        $body = @{ droneId = $d; command = "get_status"; parameters = @{} } | ConvertTo-Json -Depth 5
        try {
            $headers = @{ 'x-test-mode' = 'true' }
            $response = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Headers $headers -Body $body -TimeoutSec 10
            if ($response.success) {
                Write-Host "SUCCESS: Status retrieved for $d" -ForegroundColor Green
                if ($response.data) {
                    $status = $response.data
                    Write-Host "   Drone Status Details:" -ForegroundColor Yellow
                    
                    # Handle the actual data structure from drone bridge
                    if ($status.droneId) {
                        # Only show real PX4 simulation data, not fake/static data
                        if ($status.source -eq "px4_sitl" -or $status.source -eq "px4_hitl" -or $status.source -eq "px4_real") {
                            Write-Host "      Drone ID: $($status.droneId)" -ForegroundColor White
                            Write-Host "      Mode: $($status.mode)" -ForegroundColor White
                            Write-Host "      Flight Mode: $($status.flightMode)" -ForegroundColor White
                            Write-Host "      Battery: $($status.battery)%" -ForegroundColor White
                            Write-Host "      Position: Lat $($status.lat), Lng $($status.lng), Alt $($status.alt)m" -ForegroundColor White
                            Write-Host "      Speed: $($status.speed) m/s" -ForegroundColor White
                            Write-Host "      Heading: $($status.heading) degrees" -ForegroundColor White
                            Write-Host "      Armed: $($status.armed)" -ForegroundColor White
                            Write-Host "      Source: $($status.source)" -ForegroundColor Green
                            Write-Host "      Timestamp: $($status.timestamp)" -ForegroundColor White
                        } else {
                            Write-Host "      WARNING: No real PX4 simulation data available" -ForegroundColor Yellow
                            Write-Host "      Current source: $($status.source)" -ForegroundColor Red
                            Write-Host "      Only showing when source is: px4_sitl, px4_hitl, or px4_real" -ForegroundColor Gray
                        }
                    } else {
                        # Fallback for different data structure
                        Write-Host "      Raw Status Data:" -ForegroundColor White
                        $status | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Gray
                    }
                } else {
                    Write-Host "   WARNING: No data in response" -ForegroundColor Yellow
                }
            } else {
                Write-Host "ERROR: Failed to get status for $d : $($response.message)" -ForegroundColor Red
            }
        } catch {
            Write-Host "ERROR: Error getting status for $d : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
function Test-Takeoff($droneIds) { foreach ($d in $droneIds) { Invoke-BackendCommand $d "takeoff" @{ altitude = $TakeoffAltitude } } }
function Test-Land($droneIds) { foreach ($d in $droneIds) { Invoke-BackendCommand $d "land" @{} } }
function Test-RTL($droneIds) { foreach ($d in $droneIds) { Invoke-BackendCommand $d "return_to_launch" @{} } }
function Test-Emergency($droneIds) { foreach ($d in $droneIds) { Invoke-BackendCommand $d "emergency_stop" @{} } }
function Test-Mission($droneIds) {
    $waypoints = @( @{ lat = 47.6414678; lng = -122.1401649; alt = 30 }, @{ lat = 47.6514678; lng = -122.1501649; alt = 50 })
    $missionData = @{
        waypoints = $waypoints
        orderId = "TEST-ORDER-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        deliveryLocation = @{
            lat = 47.6514678
            lng = -122.1501649
            address = "Test Delivery Address, Seattle, WA"
        }
        customerInfo = @{
            name = "John Doe"
            phone = "+1-555-0123"
            email = "john.doe@example.com"
        }
        orderDetails = @{
            totalAmount = 29.99
            items = @("Burger", "Fries", "Drink")
        }
    }
    foreach ($d in $droneIds) { Invoke-BackendCommand $d "start_mission" $missionData }
}
function Invoke-ProofPhotoCapture($droneIds) { 
    Write-Host "Capturing proof photo from front camera..." -ForegroundColor Yellow
    foreach ($d in $droneIds) { Invoke-BackendCommand $d "capture_photo" @{ camera_type = "front" } } 
}
function Invoke-CaptureAllAngles($droneIds) { 
    Write-Host "Capturing photos from all camera angles..." -ForegroundColor Yellow
    foreach ($d in $droneIds) { Invoke-BackendCommand $d "capture_all_angles" @{} } 
}
function Switch-Camera($droneIds, $cameraType) { 
    Write-Host "Switching to $cameraType camera..." -ForegroundColor Yellow
    foreach ($d in $droneIds) { Invoke-BackendCommand $d "switch_camera" @{ camera_type = $cameraType } } 
}
function Start-AirSimCameraViews($droneIds) { 
    Write-Host "Starting AirSim camera views (mini windows)..." -ForegroundColor Magenta
    Write-Host "This will show live camera feeds from AirSim in separate windows." -ForegroundColor Gray
    foreach ($d in $droneIds) { Invoke-BackendCommand $d "start_camera_views" @{} } 
}
function Stop-AirSimCameraViews($droneIds) { 
    Write-Host "Stopping AirSim camera views..." -ForegroundColor Magenta
    foreach ($d in $droneIds) { Invoke-BackendCommand $d "stop_camera_views" @{} } 
}

function Show-CameraMenu($droneIds) {
    $cameraMenuActive = $true
    while ($cameraMenuActive) {
        Show-Title "Camera Control Menu" "Controlling: $($droneIds -join ', ')"
        Write-Host " 1. Capture Proof Photo (Front Camera)" -ForegroundColor White
        Write-Host " 2. Capture All Angles (Front/Bottom/Back)" -ForegroundColor White
        Write-Host " 3. Switch to Front Camera" -ForegroundColor White
        Write-Host " 4. Switch to Bottom Camera" -ForegroundColor White
        Write-Host " 5. Switch to Back Camera" -ForegroundColor White
        Write-Host " 6. Start AirSim Camera Views (Mini Windows)" -ForegroundColor Magenta
        Write-Host " 7. Stop AirSim Camera Views" -ForegroundColor Magenta
        Write-Host " B. Back to Main Menu" -ForegroundColor Yellow
        Write-Host " Q. Quit" -ForegroundColor Red
        
        $cameraChoice = Read-Host "
Enter your choice"
        
        switch ($cameraChoice) {
            "1" { Invoke-ProofPhotoCapture $droneIds }
            "2" { Invoke-CaptureAllAngles $droneIds }
            "3" { Switch-Camera $droneIds "front" }
            "4" { Switch-Camera $droneIds "bottom" }
            "5" { Switch-Camera $droneIds "back" }
            "6" { Start-AirSimCameraViews $droneIds }
            "7" { Stop-AirSimCameraViews $droneIds }
            "b" { $cameraMenuActive = $false }
            "q" { Write-Host "
Exiting..."; exit }
            default { Write-Host " Invalid choice." -ForegroundColor Red }
        }
        
        if ($cameraMenuActive) { 
            Read-Host "
Press Enter to continue..." 
        }
    }
}
function Test-QRCode($droneIds) { 
    Write-Host "Testing QR code generation..." -ForegroundColor Yellow
    foreach ($d in $droneIds) { 
        $qrData = @{
            orderId = "QR-TEST-$(Get-Date -Format 'HHmmss')"
            packageId = "PKG-001"
            droneId = $d
        }
        # Use the correct QR test endpoint
        $url = "$BackendBaseUrl/test/qr/generate"
        $headers = @{ 'x-test-mode' = 'true' }
        try {
            $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body ($qrData | ConvertTo-Json) -ContentType "application/json"
            Write-Host "QR code generated for $d - $($response.message)" -ForegroundColor Green
            Write-Host "QR code should now be displayed on screen!" -ForegroundColor Cyan
        } catch {
            Write-Host "QR generation failed for $d - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
function Show-Weather($droneIds) { foreach ($d in $droneIds) { Invoke-BackendCommand $d "get_weather" @{} } }
function Set-WeatherProfile($droneIds) {
    Write-Host "
Select Weather Profile:" -ForegroundColor Yellow
    Write-Host "1. Clear" -ForegroundColor White
    Write-Host "2. Rain" -ForegroundColor White
    Write-Host "3. Snow" -ForegroundColor White
    Write-Host "4. Fog" -ForegroundColor White
    Write-Host "5. Storm" -ForegroundColor White
    Write-Host "6. Windy" -ForegroundColor White
    
    $choice = Read-Host "
Enter weather profile choice (1-6)"
    
    $profiles = @{
        "1" = "Clear"
        "2" = "Rain"
        "3" = "Snow"
        "4" = "Fog"
        "5" = "Storm"
        "6" = "Windy"
    }
    
    if ($profiles.ContainsKey($choice)) {
        $weatherProfile = $profiles[$choice]
        Write-Host "
Setting weather to '$weatherProfile' for selected drones..." -ForegroundColor Yellow
        foreach ($d in $droneIds) { 
            Invoke-BackendCommand $d "set_weather_profile" @{ profile = $weatherProfile }
        }
    } else {
        Write-Host "Invalid choice. Please select 1-6." -ForegroundColor Red
    }
}
function Show-Battery($droneIds) { 
    foreach ($d in $droneIds) { 
        $url = "$BackendBaseUrl/command"
        $body = @{ droneId = $d; command = "get_battery"; parameters = @{} } | ConvertTo-Json -Depth 5
        try {
            $headers = @{ 'x-test-mode' = 'true' }
            $response = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Headers $headers -Body $body -TimeoutSec 10
            if ($response.success) {
                Write-Host "Battery command sent to $d" -ForegroundColor Green
                if ($response.data -and $response.data.data) {
                    $batteryData = $response.data.data
                    Write-Host "Battery Status for $d" -ForegroundColor Cyan
                    Write-Host "   Level - $($batteryData.level)%" -ForegroundColor White
                    Write-Host "   Voltage - $($batteryData.voltage)V" -ForegroundColor White
                    Write-Host "   Current - $($batteryData.current)A" -ForegroundColor White
                    Write-Host "   Temperature - $($batteryData.temperature)C" -ForegroundColor White
                    Write-Host "   Status - $($batteryData.status)" -ForegroundColor White
                } else {
                    Write-Host "No battery data received from drone bridge" -ForegroundColor Yellow
                }
            } else {
                Write-Host "Battery command failed for $d - $($response.message)" -ForegroundColor Red
            }
        } catch {
            Write-Host "Battery command error for $d - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
function Start-Charging($droneIds) { 
    Write-Host "
Starting battery charging for selected drones..." -ForegroundColor Yellow
    foreach ($d in $droneIds) { 
        $url = "$BackendBaseUrl/command"
        $body = @{ droneId = $d; command = "start_charging"; parameters = @{} } | ConvertTo-Json -Depth 5
        try {
            $headers = @{ 'x-test-mode' = 'true' }
            $response = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Headers $headers -Body $body -TimeoutSec 10
            if ($response.success) {
                Write-Host "Start charging command sent to $d" -ForegroundColor Green
                if ($response.data -and $response.data.data) {
                    $chargingData = $response.data.data
                    Write-Host "Charging Status for $d" -ForegroundColor Cyan
                    Write-Host "   Status - $($chargingData.status)" -ForegroundColor White
                    Write-Host "   Message - $($chargingData.message)" -ForegroundColor White
                }
            } else {
                Write-Host "Start charging failed for $d - $($response.message)" -ForegroundColor Red
            }
        } catch {
            Write-Host "Start charging error for $d - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
function Stop-Charging($droneIds) { 
    Write-Host "
Stopping battery charging for selected drones..." -ForegroundColor Yellow
    foreach ($d in $droneIds) { 
        $url = "$BackendBaseUrl/command"
        $body = @{ droneId = $d; command = "stop_charging"; parameters = @{} } | ConvertTo-Json -Depth 5
        try {
            $headers = @{ 'x-test-mode' = 'true' }
            $response = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Headers $headers -Body $body -TimeoutSec 10
            if ($response.success) {
                Write-Host "Stop charging command sent to $d" -ForegroundColor Green
                if ($response.data -and $response.data.data) {
                    $chargingData = $response.data.data
                    Write-Host "Charging Status for $d" -ForegroundColor Cyan
                    Write-Host "   Status - $($chargingData.status)" -ForegroundColor White
                    Write-Host "   Message - $($chargingData.message)" -ForegroundColor White
                }
            } else {
                Write-Host "Stop charging failed for $d - $($response.message)" -ForegroundColor Red
            }
        } catch {
            Write-Host "Stop charging error for $d - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Invoke-FullTest($droneIds) {
    Write-Host "
=== Starting Full Test Sequence for $($droneIds -join ', ') ===" -ForegroundColor Magenta
    
    # Step 1: Takeoff
    Write-Host "
Step: Takeoff" -ForegroundColor Yellow
    Test-Takeoff $droneIds
    Start-Sleep -Seconds 3
    
    # Step 2: Start Mission
    Write-Host "
Step: Start Mission" -ForegroundColor Yellow
    Test-Mission $droneIds
    Start-Sleep -Seconds 3
    
    # Step 3: Return to Launch
    Write-Host "
Step: Return to Launch" -ForegroundColor Yellow
    Test-RTL $droneIds
    Start-Sleep -Seconds 3
    
    # Step 4: Land
    Write-Host "
Step: Land" -ForegroundColor Yellow
    Test-Land $droneIds
    
    Write-Host "
=== Full Test Sequence Complete ===" -ForegroundColor Magenta
}

# --- Main Application Loop ---
while ($true) {
    $selectedDrones = Select-Drones
    if ($null -eq $selectedDrones) { break }
    if ($selectedDrones.Count -eq 0) { Read-Host "
Press Enter to return..."; continue }
    $controlTarget = if ($selectedDrones.Count -gt 1) { "$($selectedDrones.Count) drones" } else { $selectedDrones -join '' }
    
    $showMenu = $true
    while ($showMenu) {
        Show-Title "Drone Command Menu" "Controlling: $controlTarget"
        Write-Host " 1. Takeoff"; Write-Host " 2. Land"; Write-Host " 3. Return to Launch"
        Write-Host " 4. Emergency Stop"; Write-Host " 5. Start Mission"; Write-Host " 6. Get Status"
        Write-Host " 7. Full Test Sequence" -ForegroundColor Cyan
        Write-Host " 8. Weather -> Show"; Write-Host " 9. Weather -> Set Profile"
        Write-Host "10. QR Code Test" -ForegroundColor Green
        Write-Host "11. Battery -> Show"; Write-Host "12. Battery -> Start Charging"; Write-Host "13. Battery -> Stop Charging"
        Write-Host "14. Camera Menu" -ForegroundColor Cyan
        Write-Host " B. Back to Drone Selection" -ForegroundColor Yellow
        Write-Host " Q. Quit" -ForegroundColor Red
        
        $choice = Read-Host "
Enter your choice"
        switch ($choice) {
            "1" { Test-Takeoff $selectedDrones }; "2" { Test-Land $selectedDrones }
            "3" { Test-RTL $selectedDrones }; "4" { Test-Emergency $selectedDrones }
            "5" { Test-Mission $selectedDrones }; "6" { Get-DroneStatus $selectedDrones }
            "7" { Invoke-FullTest $selectedDrones }; "8" { Show-Weather $selectedDrones }
            "9" { Set-WeatherProfile $selectedDrones }; "10" { Test-QRCode $selectedDrones }
            "11" { Show-Battery $selectedDrones }; "12" { Start-Charging $selectedDrones }
            "13" { Stop-Charging $selectedDrones }; "14" { Show-CameraMenu $selectedDrones }
            "b" { $showMenu = $false }
            "q" { Write-Host "
 Exiting..."; exit }
            default { Write-Host " Invalid choice." -ForegroundColor Red }
        }
        if ($showMenu) { Read-Host "
Press Enter to continue..." }
    }
}
