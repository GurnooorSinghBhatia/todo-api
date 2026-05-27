// ╔══════════════════════════════════════════════════════════════════╗
// ║  SIT753 – HD DevOps Pipeline                                      ║
// ║  Project : Todo REST API (Node.js + Express)                      ║
// ║  Stages  : Build → Test → Code Quality → Security →               ║
// ║            Deploy → Release → Monitoring                          ║
// ╚══════════════════════════════════════════════════════════════════╝

pipeline {
    agent any

    // ── Global environment variables ──────────────────────────────────────────
    environment {
        APP_NAME      = 'todo-api'
        STAGING_PORT  = '3001'
        PROD_PORT     = '3002'
        BUILD_VERSION = "1.0.${BUILD_NUMBER}"
        NODE_ENV      = 'test'

        // ── PATH FIX for macOS Jenkins ────────────────────────────────────────
        // Jenkins on macOS runs with a restricted shell that doesn't inherit
        // your user PATH. We explicitly add all common Node/npm/pm2 locations.
        //
        // Homebrew Apple Silicon (M1/M2/M3): /opt/homebrew/bin
        // Homebrew Intel Mac:                /usr/local/bin
        // nvm default:                       ~/.nvm/versions/node/.../bin
        // System Node (fallback):            /usr/local/bin, /usr/bin
        //
        // HOW TO FIND YOUR EXACT PATHS – run in your Mac terminal:
        //   which node && which npm && which pm2
        // Then add those directories here if they differ from the ones below.
        PATH = "/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${env.PATH}"
    }

    // ── Pipeline options ──────────────────────────────────────────────────────
    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    // ── Stages ────────────────────────────────────────────────────────────────
    stages {

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │  STAGE 1 – BUILD                                                    │
        // │  Installs dependencies and creates a versioned tar.gz artifact.     │
        // └─────────────────────────────────────────────────────────────────────┘
        stage('Build') {
            steps {
                echo "╔══ BUILD – ${APP_NAME} v${BUILD_VERSION} ══╗"

                // ── Diagnostics: confirm Jenkins can find required tools ──────
                sh 'echo "PATH = $PATH"'
                sh 'which node  && node  --version || echo "ERROR: node not found – check PATH"'
                sh 'which npm   && npm   --version || echo "ERROR: npm not found  – check PATH"'
                sh 'which pm2   && pm2   --version || echo "WARNING: pm2 not found – run: npm install -g pm2"'

                // Install all dependencies (including devDependencies for later stages)
                sh 'npm install'

                // Verify Node/npm versions for audit trail
                sh 'node --version'
                sh 'npm --version'

                // Create versioned artifact (exclude git history and previous tarballs)
                sh """
                    tar -czf ${APP_NAME}-${BUILD_VERSION}.tar.gz \
                        --exclude='.git' \
                        --exclude='node_modules' \
                        --exclude='coverage' \
                        --exclude='*.tar.gz' \
                        --exclude='*.log' \
                        .
                """

                // Archive artifact so Jenkins stores it
                archiveArtifacts artifacts: "${APP_NAME}-${BUILD_VERSION}.tar.gz",
                                  fingerprint: true,
                                  onlyIfSuccessful: true

                echo "✅ Build artifact created: ${APP_NAME}-${BUILD_VERSION}.tar.gz"
            }
        }

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │  STAGE 2 – TEST                                                     │
        // │  Runs unit + integration tests with Jest, generates coverage.       │
        // └─────────────────────────────────────────────────────────────────────┘
        stage('Test') {
            environment {
                NODE_ENV = 'test'
            }
            steps {
                echo '╔══ TEST – Unit + Integration Tests ══╗'
                sh 'npm test -- --forceExit --coverage'
            }
            post {
                always {
                    // Archive coverage report for review in Jenkins UI
                    archiveArtifacts artifacts: 'coverage/**/*',
                                      allowEmptyArchive: true
                    echo 'Test results archived.'
                }
                success {
                    echo '✅ All tests passed.'
                }
                failure {
                    echo '❌ Tests failed. Review console output above.'
                }
            }
        }

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │  STAGE 3 – CODE QUALITY                                             │
        // │  ESLint checks code style, structure, and maintainability.          │
        // │  Optional: SonarQube (uncomment if server is running on :9000).     │
        // └─────────────────────────────────────────────────────────────────────┘
        stage('Code Quality') {
            steps {
                echo '╔══ CODE QUALITY – ESLint Analysis ══╗'

                // Run ESLint and save JSON report (don't fail build yet)
                sh 'npm run lint:report || true'

                // Run again for human-readable console output
                script {
                    def lintExit = sh(
                        script: 'npm run lint 2>&1',
                        returnStatus: true
                    )

                    if (lintExit == 0) {
                        echo '✅ ESLint: No issues found. Code quality is clean.'
                    } else {
                        echo '⚠️  ESLint: Issues detected (see eslint-report.json).'
                        echo '   Review and fix warnings/errors before production release.'
                        // Uncomment below to FAIL the build on lint errors:
                        // error('Code quality gate failed: ESLint errors detected.')
                    }
                }

                // Archive ESLint JSON report
                archiveArtifacts artifacts: 'eslint-report.json',
                                  allowEmptyArchive: true

                // ── Optional SonarQube ──────────────────────────────────────
                // Prerequisites:
                //   1. Download SonarQube Community: https://www.sonarsource.com/products/sonarqube/downloads/
                //   2. Run: java -jar lib/sonar-application-*.jar
                //   3. Install sonar-scanner CLI: https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/scanners/sonarscanner/
                //   4. In Jenkins: Manage Jenkins → Configure System → SonarQube servers → Add
                //      Name: SonarQube, URL: http://localhost:9000, Token: (generate in SonarQube)
                //
                // withSonarQubeEnv('SonarQube') {
                //     sh 'sonar-scanner'
                // }
                // timeout(time: 2, unit: 'MINUTES') {
                //     waitForQualityGate abortPipeline: true
                // }
            }
        }

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │  STAGE 4 – SECURITY                                                 │
        // │  npm audit scans all dependencies for known CVEs.                  │
        // └─────────────────────────────────────────────────────────────────────┘
        stage('Security') {
            steps {
                echo '╔══ SECURITY – Dependency Vulnerability Scan ══╗'

                script {
                    // Generate JSON audit report (exit 0 even if vulns found so we handle manually)
                    sh 'npm audit --json > npm-audit-report.json 2>&1 || true'

                    // Human-readable summary to console
                    def auditSummary = sh(
                        script: 'npm audit --audit-level=none 2>&1 || true',
                        returnStdout: true
                    ).trim()
                    echo auditSummary

                    // Parse critical/high vulnerability count from JSON
                    def auditJson = sh(
                        script: "node -e \"const a=require('./npm-audit-report.json'); const v=a.metadata&&a.metadata.vulnerabilities||{}; console.log(JSON.stringify(v));\"",
                        returnStdout: true
                    ).trim()

                    echo "Vulnerability breakdown: ${auditJson}"

                    def critical = sh(
                        script: "node -e \"const a=require('./npm-audit-report.json'); console.log((a.metadata&&a.metadata.vulnerabilities&&a.metadata.vulnerabilities.critical)||0);\"",
                        returnStdout: true
                    ).trim().toInteger()

                    def high = sh(
                        script: "node -e \"const a=require('./npm-audit-report.json'); console.log((a.metadata&&a.metadata.vulnerabilities&&a.metadata.vulnerabilities.high)||0);\"",
                        returnStdout: true
                    ).trim().toInteger()

                    if (critical > 0) {
                        echo "🚨 CRITICAL vulnerabilities found: ${critical}. Investigate npm-audit-report.json immediately."
                        error("Security gate failed: ${critical} critical vulnerability/vulnerabilities detected.")
                    } else if (high > 0) {
                        echo "⚠️  HIGH severity vulnerabilities: ${high}. Schedule remediation (update affected packages)."
                    } else {
                        echo '✅ Security scan passed. No critical/high vulnerabilities found.'
                    }
                }

                // Archive security report
                archiveArtifacts artifacts: 'npm-audit-report.json',
                                  allowEmptyArchive: true
            }
        }

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │  STAGE 5 – DEPLOY (Staging)                                         │
        // │  Deploys the app to a local staging environment on port 3001        │
        // │  using PM2 process manager.                                         │
        // └─────────────────────────────────────────────────────────────────────┘
        stage('Deploy') {
            steps {
                echo "╔══ DEPLOY – Staging on port ${STAGING_PORT} ══╗"

                script {
                    // Stop any existing staging instance cleanly
                    sh "pm2 delete ${APP_NAME}-staging || true"

                    // Start staging environment
                    sh """
                        PORT=${STAGING_PORT} \
                        NODE_ENV=staging \
                        pm2 start src/app.js \
                            --name ${APP_NAME}-staging \
                            --log logs/staging.log \
                            --time
                    """

                    // Persist PM2 process list (survives reboots)
                    sh 'pm2 save'

                    // Wait for app to fully start
                    sleep(time: 4, unit: 'SECONDS')

                    // Smoke test – must return HTTP 200
                    def healthCheck = sh(
                        script: "curl -sf http://localhost:${STAGING_PORT}/health",
                        returnStatus: true
                    )

                    if (healthCheck != 0) {
                        sh "pm2 logs ${APP_NAME}-staging --lines 20 || true"
                        error("❌ Staging health check failed. Application did not start on port ${STAGING_PORT}.")
                    }

                    echo "✅ Staging deployment successful: http://localhost:${STAGING_PORT}"
                }
            }
        }

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │  STAGE 6 – RELEASE (Production)                                     │
        // │  Tags the release in Git, promotes the verified build to            │
        // │  production on port 3002.                                           │
        // └─────────────────────────────────────────────────────────────────────┘
        stage('Release') {
            steps {
                echo "╔══ RELEASE – Production v${BUILD_VERSION} on port ${PROD_PORT} ══╗"

                script {
                    // Tag the release in Git (annotated tag with version)
                    sh """
                        git config user.email 'jenkins@localhost' || true
                        git config user.name  'Jenkins CI'        || true
                        git tag -a v${BUILD_VERSION} -m 'Release v${BUILD_VERSION} – Build #${BUILD_NUMBER}' || true
                    """
                    echo "Git tag v${BUILD_VERSION} created."

                    // Stop any existing production instance
                    sh "pm2 delete ${APP_NAME}-production || true"

                    // Start production environment
                    sh """
                        PORT=${PROD_PORT} \
                        NODE_ENV=production \
                        pm2 start src/app.js \
                            --name ${APP_NAME}-production \
                            --log logs/production.log \
                            --time
                    """

                    sh 'pm2 save'

                    // Wait for startup
                    sleep(time: 4, unit: 'SECONDS')

                    // Verify production health
                    def healthCheck = sh(
                        script: "curl -sf http://localhost:${PROD_PORT}/health",
                        returnStatus: true
                    )

                    if (healthCheck != 0) {
                        sh "pm2 logs ${APP_NAME}-production --lines 20 || true"
                        error("❌ Production health check failed. Rolling back.")
                    }

                    // Confirm version in response
                    sh "curl -s http://localhost:${PROD_PORT}/health | node -e \"const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log('Health:', JSON.parse(d).status);\" || true"

                    echo "✅ Production release v${BUILD_VERSION} is live: http://localhost:${PROD_PORT}"
                }
            }
        }

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │  STAGE 7 – MONITORING & ALERTING                                    │
        // │  Validates both environments are healthy, checks Prometheus metrics  │
        // │  and writes a timestamped log. Exits non-zero to alert on failure.  │
        // └─────────────────────────────────────────────────────────────────────┘
        stage('Monitoring') {
            steps {
                echo '╔══ MONITORING & ALERTING ══╗'

                script {
                    // Create logs directory if missing
                    sh 'mkdir -p logs'

                    // Run our monitoring health check script
                    def monitorExit = sh(
                        script: "STAGING_PORT=${STAGING_PORT} PROD_PORT=${PROD_PORT} node scripts/health-check.js",
                        returnStatus: true
                    )

                    // Show PM2 process list for audit trail
                    sh 'pm2 list'

                    // Show live Prometheus metrics (first 25 lines)
                    echo '── Prometheus Metrics Snapshot (production) ──'
                    sh "curl -s http://localhost:${PROD_PORT}/metrics | head -25 || true"

                    // Archive monitoring log
                    archiveArtifacts artifacts: 'monitoring.log',
                                      allowEmptyArchive: true

                    if (monitorExit != 0) {
                        // Non-zero exit = ALERT condition triggered
                        error("🚨 MONITORING ALERT: One or more environments failed health check. See monitoring.log.")
                    }

                    echo '✅ Monitoring checks passed. All environments healthy.'
                }
            }
        }
    }

    // ── Post-pipeline actions ─────────────────────────────────────────────────
    post {
        success {
            echo """
╔══════════════════════════════════════════════════════════╗
║  ✅  PIPELINE SUCCESS – ${APP_NAME} v${BUILD_VERSION}
║  Staging   : http://localhost:${STAGING_PORT}
║  Production: http://localhost:${PROD_PORT}
║  Build #   : ${BUILD_NUMBER}
╚══════════════════════════════════════════════════════════╝
            """
        }

        failure {
            echo """
╔══════════════════════════════════════════════════════════╗
║  ❌  PIPELINE FAILED – Rolling back processes
╚══════════════════════════════════════════════════════════╝
            """
            // Rollback: stop both environments on failure
            script {
                sh "pm2 delete ${APP_NAME}-staging    || true"
                sh "pm2 delete ${APP_NAME}-production || true"
                sh 'pm2 save || true'
            }
        }

        always {
            echo "Pipeline completed. Stage: ${currentBuild.currentResult}"
            // Clean workspace artifacts older than 5 builds (keep disk tidy)
            cleanWs(
                cleanWhenSuccess: false,
                cleanWhenFailure: false,
                notFailBuild: true,
                patterns: [[pattern: '*.tar.gz', type: 'INCLUDE']]
            )
        }
    }
}
