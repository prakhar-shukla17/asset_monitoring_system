# 🤖 AI/ML Predictions Guide

## Overview
This system uses 3 types of AI/ML predictions to monitor your IT assets and predict potential issues.

## 1. 💾 Disk Space Prediction

### What it does:
- Analyzes historical disk usage trends
- Predicts when disk will reach 100% capacity
- Uses **Linear Regression** algorithm

### How it works:
1. Collects disk usage data over time
2. Calculates daily increase rate
3. Projects when disk will be full
4. Provides confidence score based on data consistency

### Example Output:
```
Days Remaining: 9.2 days
Confidence: 85%
Current Usage: 67.3%
Daily Increase: 3.6%
```

### What the numbers mean:
- **Days Remaining**: How many days until disk is 100% full
- **Confidence**: How reliable the prediction is (0-100%)
- **Current Usage**: Current disk space used
- **Daily Increase**: Average % increase per day

### Alert Levels:
- 🔴 **High**: < 7 days remaining
- 🟡 **Medium**: 7-30 days remaining  
- 🟢 **Low**: > 30 days remaining

---

## 2. 🔍 Anomaly Detection

### What it does:
- Detects unusual performance patterns
- Identifies system behavior that deviates from normal
- Uses **Isolation Forest** algorithm

### How it works:
1. Learns "normal" behavior from historical data
2. Compares recent data to baseline
3. Flags unusual combinations of CPU/RAM/Disk usage
4. Considers time patterns (hour of day, day of week)

### What triggers an anomaly:
- **Resource Spikes**: Sudden high CPU/RAM usage
- **Unusual Patterns**: Performance outside normal ranges
- **Timing Anomalies**: High usage at unexpected times
- **Combined Metrics**: Unusual combinations of resource usage

### Anomaly Details:
Each detected anomaly shows:
- **Timestamp**: When the anomaly occurred
- **Severity**: High/Medium/Low based on impact
- **CPU Usage**: Processor utilization at that time
- **RAM Usage**: Memory utilization at that time  
- **Disk Usage**: Storage utilization at that time
- **Anomaly Score**: How unusual it was (-1 to 0, more negative = more unusual)

### Example Anomalies:
```
Anomaly #1 - High Severity
Time: 2025-08-09 14:30:00
CPU: 98.6% | RAM: 94.2% | Disk: 45.3%
Score: -0.847
Explanation: Very high CPU and RAM usage simultaneously

Anomaly #2 - Medium Severity  
Time: 2025-08-09 02:15:00
CPU: 45.2% | RAM: 78.9% | Disk: 67.1%
Score: -0.234
Explanation: Unusual usage pattern for nighttime hours
```

### Alert Levels:
- 🔴 **High**: Critical resource overload (>90% CPU/RAM)
- 🟡 **Medium**: Moderate unusual patterns
- 🟢 **Low**: Minor deviations from normal

---

## 3. 📈 Performance Analysis

### What it does:
- Analyzes overall system health trends
- Provides actionable recommendations
- Uses **Rule-based Analysis** with ML insights

### How it works:
1. Calculates average usage over time periods
2. Identifies performance trends
3. Applies business rules for recommendations
4. Generates health score (0-100)

### Health Score Calculation:
- **90-100**: Excellent performance
- **75-89**: Good performance  
- **50-74**: Fair performance, some concerns
- **25-49**: Poor performance, action needed
- **0-24**: Critical performance issues

### Example Recommendations:
```
High Priority:
- "Consistently high RAM usage (87% average). Consider RAM upgrade."
- "CPU spikes detected during business hours. Investigate background processes."

Medium Priority:
- "Disk usage trending upward. Schedule cleanup in 2 weeks."
- "Network performance degraded 15% this week."

Low Priority:
- "System uptime excellent (99.8% this month)."
- "Performance stable within normal ranges."
```

---

## 🚨 Understanding Your 29 Anomalies

If you're seeing 29 anomalies, here's what to look for:

### Check for:
1. **High CPU/RAM Spikes**: Look for values >90%
2. **Unusual Timing**: High usage during off-hours
3. **Resource Competition**: Multiple resources high simultaneously
4. **Pattern Changes**: Different usage compared to baseline

### Common Causes:
- **Software Updates**: System updates causing temporary spikes
- **Background Processes**: Antivirus scans, backups, indexing
- **Application Issues**: Memory leaks, runaway processes
- **Hardware Stress**: Overheating, failing components
- **Network Activity**: Large downloads, sync operations

### Investigation Steps:
1. **Click "📋 View Anomaly Details"** on the anomaly card
2. **Sort by severity** - focus on High severity first
3. **Check timestamps** - identify patterns or specific events
4. **Cross-reference with known activities** - updates, backups, etc.
5. **Monitor trends** - are anomalies increasing over time?

---

## 🎯 Action Items Based on Predictions

### For Disk Predictions:
- **< 7 days**: Immediate action - clean up files, add storage
- **7-30 days**: Plan maintenance window for cleanup/expansion
- **> 30 days**: Monitor trend, no immediate action needed

### For Anomalies:
- **High Severity**: Investigate immediately - check Task Manager
- **Medium Severity**: Monitor for patterns, investigate if recurring
- **Low Severity**: Document for trend analysis

### For Performance Analysis:
- **Health Score < 50**: Immediate performance review needed
- **Health Score 50-75**: Plan performance improvements
- **Health Score > 75**: System performing well

---

## 🔧 Tuning Sensitivity

If you're getting too many false positives:

1. **Adjust contamination rate** in `ml-service/config.py`:
   ```python
   ANOMALY_CONTAMINATION = 0.05  # Reduce from 0.1 to 0.05 (5%)
   ```

2. **Increase minimum data points**:
   ```python
   MINIMUM_DATA_POINTS = 10  # Increase from 3
   ```

3. **Adjust thresholds**:
   ```python
   HIGH_USAGE_THRESHOLD = 95  # Increase from 90
   ```

This guide helps you understand exactly what the AI/ML system is telling you about your infrastructure! 🎯
