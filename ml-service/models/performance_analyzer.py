import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import logging

class PerformanceAnalyzer:
    """Rule-based performance analysis and recommendations"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def analyze_performance_trends(self, telemetry_data):
        """Analyze performance trends and generate recommendations"""
        try:
            if len(telemetry_data) < 5:
                return {
                    'success': False,
                    'message': 'Insufficient data for analysis',
                    'recommendations': []
                }
            
            # Convert to DataFrame
            df = pd.DataFrame(telemetry_data)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('timestamp')
            
            # Calculate statistics
            stats = {
                'cpu': {
                    'avg': df['cpu_usage_percent'].mean(),
                    'max': df['cpu_usage_percent'].max(),
                    'min': df['cpu_usage_percent'].min(),
                    'std': df['cpu_usage_percent'].std()
                },
                'ram': {
                    'avg': df['ram_usage_percent'].mean(),
                    'max': df['ram_usage_percent'].max(),
                    'min': df['ram_usage_percent'].min(),
                    'std': df['ram_usage_percent'].std()
                },
                'disk': {
                    'avg': df['disk_usage_percent'].mean(),
                    'max': df['disk_usage_percent'].max(),
                    'min': df['disk_usage_percent'].min(),
                    'std': df['disk_usage_percent'].std()
                }
            }
            
            # Generate recommendations
            recommendations = self._generate_recommendations(stats, df)
            
            # Calculate overall health score
            health_score = self._calculate_health_score(stats)
            
            return {
                'success': True,
                'message': f'Analyzed {len(telemetry_data)} data points',
                'statistics': stats,
                'recommendations': recommendations,
                'health_score': health_score,
                'analysis_period': {
                    'start': df['timestamp'].min().isoformat(),
                    'end': df['timestamp'].max().isoformat(),
                    'duration_hours': (df['timestamp'].max() - df['timestamp'].min()).total_seconds() / 3600
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error in performance analysis: {e}")
            return {
                'success': False,
                'message': f'Analysis error: {str(e)}',
                'recommendations': []
            }
    
    def _generate_recommendations(self, stats, df):
        """Generate actionable recommendations based on statistics"""
        recommendations = []
        
        # CPU Analysis
        cpu_avg = stats['cpu']['avg']
        cpu_max = stats['cpu']['max']
        
        if cpu_avg > 85:
            recommendations.append({
                'type': 'cpu_high_average',
                'priority': 'High',
                'message': f'Average CPU usage is {cpu_avg:.1f}% - investigate background processes',
                'action': 'Check Task Manager for high CPU processes',
                'impact': 'Performance degradation'
            })
        elif cpu_avg > 70:
            recommendations.append({
                'type': 'cpu_moderate',
                'priority': 'Medium',
                'message': f'CPU usage averaging {cpu_avg:.1f}% - monitor for trends',
                'action': 'Consider process optimization',
                'impact': 'Potential performance issues'
            })
        
        if cpu_max > 98:
            recommendations.append({
                'type': 'cpu_spikes',
                'priority': 'Medium',
                'message': f'CPU spikes detected (max {cpu_max:.1f}%)',
                'action': 'Investigate sporadic high CPU usage',
                'impact': 'System responsiveness'
            })
        
        # RAM Analysis
        ram_avg = stats['ram']['avg']
        ram_max = stats['ram']['max']
        
        if ram_avg > 90:
            recommendations.append({
                'type': 'ram_upgrade_needed',
                'priority': 'High',
                'message': f'RAM consistently high ({ram_avg:.1f}%) - upgrade recommended',
                'action': 'Plan RAM upgrade or close unnecessary applications',
                'impact': 'System stability and performance'
            })
        elif ram_avg > 80:
            recommendations.append({
                'type': 'ram_monitor',
                'priority': 'Medium',
                'message': f'RAM usage trending high ({ram_avg:.1f}%)',
                'action': 'Monitor memory usage and close unused applications',
                'impact': 'Potential slowdowns'
            })
        
        # Disk Analysis
        disk_avg = stats['disk']['avg']
        
        if disk_avg > 90:
            recommendations.append({
                'type': 'disk_cleanup_urgent',
                'priority': 'High',
                'message': f'Disk space critically low ({disk_avg:.1f}%)',
                'action': 'Immediate disk cleanup required',
                'impact': 'System stability risk'
            })
        elif disk_avg > 80:
            recommendations.append({
                'type': 'disk_cleanup_planned',
                'priority': 'Medium',
                'message': f'Disk usage high ({disk_avg:.1f}%) - schedule cleanup',
                'action': 'Plan disk cleanup within 1-2 weeks',
                'impact': 'Future storage issues'
            })
        
        # Variability Analysis
        cpu_std = stats['cpu']['std']
        if cpu_std > 25:  # High variability
            recommendations.append({
                'type': 'cpu_variability',
                'priority': 'Low',
                'message': f'High CPU usage variability (std: {cpu_std:.1f})',
                'action': 'Investigate inconsistent workloads',
                'impact': 'Unpredictable performance'
            })
        
        # Time-based patterns
        time_recommendations = self._analyze_time_patterns(df)
        recommendations.extend(time_recommendations)
        
        return recommendations
    
    def _analyze_time_patterns(self, df):
        """Analyze time-based usage patterns"""
        recommendations = []
        
        try:
            # Group by hour to find peak usage times
            df['hour'] = df['timestamp'].dt.hour
            hourly_cpu = df.groupby('hour')['cpu_usage_percent'].mean()
            
            peak_hours = hourly_cpu[hourly_cpu > 80].index.tolist()
            
            if len(peak_hours) > 0:
                peak_hours_str = ', '.join([f"{h}:00" for h in peak_hours])
                recommendations.append({
                    'type': 'peak_hours_detected',
                    'priority': 'Low',
                    'message': f'High CPU usage during hours: {peak_hours_str}',
                    'action': 'Schedule intensive tasks outside peak hours',
                    'impact': 'User experience during peak times'
                })
            
            # Weekend vs weekday analysis
            df['is_weekend'] = df['timestamp'].dt.dayofweek >= 5
            weekend_avg = df[df['is_weekend']]['cpu_usage_percent'].mean()
            weekday_avg = df[~df['is_weekend']]['cpu_usage_percent'].mean()
            
            if weekend_avg > weekday_avg + 20:  # Significantly higher on weekends
                recommendations.append({
                    'type': 'weekend_high_usage',
                    'priority': 'Low',
                    'message': f'Higher usage on weekends ({weekend_avg:.1f}% vs {weekday_avg:.1f}%)',
                    'action': 'Investigate weekend processes or scheduled tasks',
                    'impact': 'Unexpected resource consumption'
                })
            
        except Exception as e:
            self.logger.error(f"Error in time pattern analysis: {e}")
        
        return recommendations
    
    def _calculate_health_score(self, stats):
        """Calculate overall system health score (0-100)"""
        try:
            # Weight factors
            cpu_weight = 0.4
            ram_weight = 0.4
            disk_weight = 0.2
            
            # Calculate individual scores (100 = perfect, 0 = terrible)
            cpu_score = max(0, 100 - stats['cpu']['avg'])
            ram_score = max(0, 100 - stats['ram']['avg'])
            disk_score = max(0, 100 - stats['disk']['avg'])
            
            # Weighted average
            health_score = (
                cpu_score * cpu_weight +
                ram_score * ram_weight +
                disk_score * disk_weight
            )
            
            return round(health_score, 1)
            
        except Exception as e:
            self.logger.error(f"Error calculating health score: {e}")
            return 50.0  # Default to neutral score

# Test function
if __name__ == "__main__":
    import random
    
    analyzer = PerformanceAnalyzer()
    
    # Generate sample data with various patterns
    sample_data = []
    base_time = datetime.now() - timedelta(days=3)
    
    for i in range(72):  # 3 days * 24 hours
        hour = (base_time + timedelta(hours=i)).hour
        is_weekend = (base_time + timedelta(hours=i)).weekday() >= 5
        
        # Simulate higher usage during work hours (9-17) on weekdays
        if not is_weekend and 9 <= hour <= 17:
            cpu_base = 60
            ram_base = 70
        else:
            cpu_base = 30
            ram_base = 50
        
        sample_data.append({
            'timestamp': base_time + timedelta(hours=i),
            'cpu_usage_percent': cpu_base + random.uniform(-20, 20),
            'ram_usage_percent': ram_base + random.uniform(-15, 15),
            'disk_usage_percent': 75 + random.uniform(-5, 5)
        })
    
    # Test analysis
    result = analyzer.analyze_performance_trends(sample_data)
    
    print("\n🧪 Test Performance Analysis Result:")
    print(f"Success: {result['success']}")
    print(f"Health Score: {result.get('health_score', 'N/A')}/100")
    print(f"Recommendations: {len(result.get('recommendations', []))}")
    
    if result.get('recommendations'):
        print("\n💡 Recommendations:")
        for rec in result['recommendations']:
            print(f"  [{rec['priority']}] {rec['message']}")
            print(f"      Action: {rec['action']}")
            print("  ---")

