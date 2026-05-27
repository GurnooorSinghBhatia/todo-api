'use strict';

/**
 * health-check.js
 * Monitoring script for SIT753 pipeline – Monitoring & Alerting stage.
 * Checks /health on both staging and production, logs results, exits 1 on failure.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const STAGING_PORT = process.env.STAGING_PORT || 3001;
const PROD_PORT = process.env.PROD_PORT || 3002;
const LOG_FILE = path.join(__dirname, '..', 'monitoring.log');

function checkHealth(port, environment) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port,
      path: '/health',
      method: 'GET',
      timeout: 5000,
    };

    const startTime = Date.now();

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        let body = {};
        try { body = JSON.parse(data); } catch (_) { /* ignore */ }

        resolve({
          environment,
          port,
          httpStatus: res.statusCode,
          status: res.statusCode === 200 ? 'HEALTHY' : 'UNHEALTHY',
          responseTimeMs: responseTime,
          appStatus: body.status || 'unknown',
          uptime: body.uptime || null,
          timestamp: new Date().toISOString(),
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        environment,
        port,
        status: 'TIMEOUT',
        responseTimeMs: 5000,
        timestamp: new Date().toISOString(),
      });
    });

    req.on('error', (err) => {
      resolve({
        environment,
        port,
        status: 'UNREACHABLE',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    });

    req.end();
  });
}

function checkMetrics(port, environment) {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: 'localhost', port, path: '/metrics', method: 'GET', timeout: 5000 },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const hasMetrics = data.includes('http_requests_total');
          resolve({ environment, metricsAvailable: res.statusCode === 200, hasHttpMetrics: hasMetrics });
        });
      }
    );
    req.on('error', () => resolve({ environment, metricsAvailable: false }));
    req.on('timeout', () => { req.destroy(); resolve({ environment, metricsAvailable: false }); });
    req.end();
  });
}

function writeLog(entries) {
  const lines = entries.map((e) => `[${e.timestamp}] ${e.environment.toUpperCase()} | ${e.status} | ${e.responseTimeMs || 'N/A'}ms`).join('\n');
  fs.appendFileSync(LOG_FILE, lines + '\n', 'utf8');
}

function printSeparator() {
  console.log('─'.repeat(60));
}

async function main() {
  console.log('\n🔍  MONITORING & ALERTING CHECK');
  printSeparator();
  console.log(`Checking environments at ${new Date().toISOString()}`);
  printSeparator();

  const [stagingHealth, prodHealth, stagingMetrics, prodMetrics] = await Promise.all([
    checkHealth(STAGING_PORT, 'staging'),
    checkHealth(PROD_PORT, 'production'),
    checkMetrics(STAGING_PORT, 'staging'),
    checkMetrics(PROD_PORT, 'production'),
  ]);

  const results = [stagingHealth, prodHealth];

  // ── Print results ────────────────────────────────────────────────────────────
  results.forEach((r) => {
    const icon = r.status === 'HEALTHY' ? '✅' : '❌';
    console.log(`\n${icon}  ${r.environment.toUpperCase()} (port ${r.port})`);
    console.log(`   Status       : ${r.status}`);
    console.log(`   HTTP Code    : ${r.httpStatus || 'N/A'}`);
    console.log(`   Response Time: ${r.responseTimeMs || 'N/A'}ms`);
    console.log(`   App Uptime   : ${r.uptime ? r.uptime.toFixed(1) + 's' : 'N/A'}`);
    if (r.error) {
      console.log(`   Error        : ${r.error}`);
    }
  });

  console.log('\n📊  METRICS');
  printSeparator();
  [stagingMetrics, prodMetrics].forEach((m) => {
    console.log(`   ${m.environment}: metrics=${m.metricsAvailable ? 'available' : 'unavailable'}, http_counter=${m.hasHttpMetrics ? 'present' : 'missing'}`);
  });

  // ── Write to log ─────────────────────────────────────────────────────────────
  writeLog(results);
  console.log(`\n📁  Log written to: monitoring.log`);
  printSeparator();

  // ── Alert check ───────────────────────────────────────────────────────────────
  const failures = results.filter((r) => r.status !== 'HEALTHY');
  if (failures.length > 0) {
    console.error('\n🚨  ALERT: The following environments are NOT healthy:');
    failures.forEach((f) => console.error(`   - ${f.environment.toUpperCase()} on port ${f.port}: ${f.status}`));
    console.error('   → Action required: Check PM2 logs with: pm2 logs');
    process.exit(1);
  }

  console.log('\n✅  All environments are healthy. No alerts triggered.');
  process.exit(0);
}

main();
