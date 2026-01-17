"""
Health Monitoring Module

Provides health check endpoints and system monitoring for the trading bot.

Features:
- HTTP health endpoint for UptimeRobot/external monitoring
- Connection status tracking
- Data freshness monitoring
- System resource monitoring
- Heartbeat for internal monitoring

Usage:
    from src.monitoring.health import HealthMonitor, start_health_server
    
    # Start health server
    await start_health_server(port=8080)
    
    # Or manually check health
    monitor = HealthMonitor()
    status = await monitor.get_health_status()
"""

import asyncio
import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


class HealthStatus(Enum):
    """Overall health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class ComponentHealth:
    """Health status of a single component."""
    name: str
    status: HealthStatus
    message: str = ""
    last_check: datetime = field(default_factory=datetime.now)
    details: dict = field(default_factory=dict)


@dataclass
class SystemMetrics:
    """System resource metrics."""
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    disk_percent: float = 0.0
    open_files: int = 0


class HealthMonitor:
    """
    Central health monitoring for the trading bot.
    
    Tracks:
    - IBKR connection status
    - Data freshness (OHLCV updates)
    - Circuit breaker status
    - System resources
    """
    
    def __init__(self):
        self.components: dict[str, ComponentHealth] = {}
        self.last_ohlcv_update: datetime = datetime.min
        self.last_trade_time: datetime = datetime.min
        self.start_time: datetime = datetime.now()
        
        # Thresholds
        self.data_stale_threshold = timedelta(minutes=5)
        self.memory_warning_threshold = 80.0  # percent
        self.cpu_warning_threshold = 90.0  # percent
    
    def update_component(
        self,
        name: str,
        status: HealthStatus,
        message: str = "",
        details: dict | None = None,
    ) -> None:
        """Update health status of a component."""
        self.components[name] = ComponentHealth(
            name=name,
            status=status,
            message=message,
            last_check=datetime.now(),
            details=details or {},
        )
    
    def record_ohlcv_update(self) -> None:
        """Record that OHLCV data was updated."""
        self.last_ohlcv_update = datetime.now()
    
    def record_trade(self) -> None:
        """Record that a trade was executed."""
        self.last_trade_time = datetime.now()
    
    def get_system_metrics(self) -> SystemMetrics:
        """Get current system resource metrics."""
        metrics = SystemMetrics()
        
        try:
            import psutil
            
            metrics.cpu_percent = psutil.cpu_percent(interval=0.1)
            metrics.memory_percent = psutil.virtual_memory().percent
            metrics.disk_percent = psutil.disk_usage("/").percent
            
            process = psutil.Process(os.getpid())
            metrics.open_files = len(process.open_files())
            
        except ImportError:
            # psutil not installed - return defaults
            pass
        except Exception as e:
            logger.warning("system_metrics_error", error=str(e))
        
        return metrics
    
    async def get_health_status(self) -> dict[str, Any]:
        """
        Get comprehensive health status.
        
        Returns:
            Dict with health status, components, and metrics
        """
        # Get system metrics
        metrics = self.get_system_metrics()
        
        # Check data freshness
        data_age = datetime.now() - self.last_ohlcv_update
        if self.last_ohlcv_update == datetime.min:
            data_status = HealthStatus.UNHEALTHY
            data_message = "No OHLCV data received yet"
        elif data_age > self.data_stale_threshold:
            data_status = HealthStatus.DEGRADED
            data_message = f"OHLCV data is {data_age.total_seconds():.0f}s old"
        else:
            data_status = HealthStatus.HEALTHY
            data_message = f"Last update {data_age.total_seconds():.0f}s ago"
        
        self.update_component("data_freshness", data_status, data_message, {
            "last_update": self.last_ohlcv_update.isoformat() if self.last_ohlcv_update != datetime.min else None,
            "age_seconds": data_age.total_seconds() if self.last_ohlcv_update != datetime.min else None,
        })
        
        # Check system resources
        if metrics.memory_percent > self.memory_warning_threshold:
            self.update_component(
                "system_resources",
                HealthStatus.DEGRADED,
                f"High memory usage: {metrics.memory_percent:.1f}%",
            )
        elif metrics.cpu_percent > self.cpu_warning_threshold:
            self.update_component(
                "system_resources",
                HealthStatus.DEGRADED,
                f"High CPU usage: {metrics.cpu_percent:.1f}%",
            )
        else:
            self.update_component(
                "system_resources",
                HealthStatus.HEALTHY,
                "System resources normal",
            )
        
        # Determine overall status
        statuses = [c.status for c in self.components.values()]
        if HealthStatus.UNHEALTHY in statuses:
            overall_status = HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        # Build response
        return {
            "status": overall_status.value,
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": (datetime.now() - self.start_time).total_seconds(),
            "components": {
                name: {
                    "status": comp.status.value,
                    "message": comp.message,
                    "last_check": comp.last_check.isoformat(),
                    "details": comp.details,
                }
                for name, comp in self.components.items()
            },
            "metrics": {
                "cpu_percent": metrics.cpu_percent,
                "memory_percent": metrics.memory_percent,
                "disk_percent": metrics.disk_percent,
                "open_files": metrics.open_files,
            },
            "trading": {
                "last_ohlcv_update": self.last_ohlcv_update.isoformat() if self.last_ohlcv_update != datetime.min else None,
                "last_trade": self.last_trade_time.isoformat() if self.last_trade_time != datetime.min else None,
            },
        }
    
    async def check_all(self) -> bool:
        """
        Run all health checks.
        
        Returns:
            True if all checks pass (healthy or degraded)
        """
        status = await self.get_health_status()
        return status["status"] != HealthStatus.UNHEALTHY.value


# Global health monitor instance
_health_monitor: HealthMonitor | None = None


def get_health_monitor() -> HealthMonitor:
    """Get or create the global health monitor instance."""
    global _health_monitor
    if _health_monitor is None:
        _health_monitor = HealthMonitor()
    return _health_monitor


# ==================== HTTP Health Server ====================

class HealthServer:
    """Simple HTTP server for health checks."""
    
    def __init__(self, monitor: HealthMonitor, port: int = 8080):
        self.monitor = monitor
        self.port = port
        self._server: asyncio.Server | None = None
    
    async def handle_request(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        """Handle incoming HTTP request."""
        try:
            # Read request
            request_line = await reader.readline()
            request = request_line.decode().strip()
            
            # Read headers (we don't use them, but need to consume)
            while True:
                line = await reader.readline()
                if line == b"\r\n" or line == b"\n" or line == b"":
                    break
            
            # Parse request
            parts = request.split(" ")
            if len(parts) >= 2:
                method, path = parts[0], parts[1]
            else:
                method, path = "GET", "/"
            
            # Route request
            if path == "/health" or path == "/":
                status = await self.monitor.get_health_status()
                body = json.dumps(status, indent=2)
                
                http_status = "200 OK" if status["status"] != "unhealthy" else "503 Service Unavailable"
                
            elif path == "/ready":
                # Readiness check - is the bot ready to trade?
                is_ready = await self.monitor.check_all()
                body = json.dumps({"ready": is_ready})
                http_status = "200 OK" if is_ready else "503 Service Unavailable"
                
            elif path == "/live":
                # Liveness check - is the process alive?
                body = json.dumps({"alive": True, "timestamp": datetime.now().isoformat()})
                http_status = "200 OK"
                
            else:
                body = json.dumps({"error": "Not found"})
                http_status = "404 Not Found"
            
            # Send response
            response = (
                f"HTTP/1.1 {http_status}\r\n"
                f"Content-Type: application/json\r\n"
                f"Content-Length: {len(body)}\r\n"
                f"Connection: close\r\n"
                f"\r\n"
                f"{body}"
            )
            
            writer.write(response.encode())
            await writer.drain()
            
        except Exception as e:
            logger.error("health_request_error", error=str(e))
        finally:
            writer.close()
            await writer.wait_closed()
    
    async def start(self) -> None:
        """Start the health server."""
        self._server = await asyncio.start_server(
            self.handle_request,
            "0.0.0.0",
            self.port,
        )
        
        logger.info("health_server_started", port=self.port)
    
    async def stop(self) -> None:
        """Stop the health server."""
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            logger.info("health_server_stopped")


async def start_health_server(port: int = 8080) -> HealthServer:
    """
    Start the health check HTTP server.
    
    Args:
        port: Port to listen on (default 8080)
    
    Returns:
        HealthServer instance
    """
    monitor = get_health_monitor()
    server = HealthServer(monitor, port)
    await server.start()
    return server
