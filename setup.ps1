Write-Host "Setting up ResolveAI..."

# 1. Create root .env if missing
if (!(Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "Creating .env from .env.example..."
        Copy-Item ".env.example" ".env"
    } else {
        Write-Host "ERROR: .env.example not found. Stop."
        exit 1
    }
} else {
    Write-Host ".env already exists. Skipping..."
}

# 2. Create backend .env if missing (fix Docker issue)
if (!(Test-Path "backend\.env")) {
    if (Test-Path ".env") {
        Write-Host "Syncing .env to backend\.env..."
        Copy-Item ".env" "backend\.env"
    } else {
        Write-Host "ERROR: root .env missing. Stop."
        exit 1
    }
} else {
    Write-Host "backend .env already exists. Skipping..."
}

# 3. Check Docker
$docker = Get-Command docker -ErrorAction SilentlyContinue

if (-not $docker) {
    Write-Host "ERROR: Docker is not installed or not in PATH"
    exit 1
}

Write-Host "Docker detected"

# 4. Find docker-compose location
$composePath = ""

if (Test-Path "docker-compose.yml") {
    $composePath = "."
}
elseif (Test-Path "backend\docker-compose.yml") {
    $composePath = "backend"
}
elseif (Test-Path "backend\compose.yml") {
    $composePath = "backend"
}
else {
    Write-Host "ERROR: No docker-compose file found"
    exit 1
}

Write-Host "Using compose location: $composePath"

# 5. Start Docker
Push-Location $composePath

Write-Host "Starting services with Docker..."

docker compose down
docker compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Host "ERROR: Docker failed to start"
    exit 1
}

Pop-Location

Write-Host "All services running"
Write-Host "Use: docker compose logs -f"