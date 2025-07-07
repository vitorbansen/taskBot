'use client'

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Clock, Calendar, Settings, Trash2, Check } from 'lucide-react';
import { useRouter } from 'next/dist/client/components/navigation';

interface Robot {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  manual: boolean;
  day: number;
  isDaily?: boolean;
}

const RobotScheduler = () => {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showAddRobot, setShowAddRobot] = useState(false);
  const [newRobot, setNewRobot] = useState({
    name: '',
    startTime: '',
    endTime: '',
    color: '#3B82F6',
    manual: false,
    isDaily: false
  });

  // Predefined colors for robots
    const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F43F5E',
    '#34D399', '#818CF8', '#FB7185', '#FACC15'
  ];

  // Generate days of the month (1-30)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  // Generate hours of the day (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Fetch robots from backend
  const fetchRobots = async () => {
    try {
      const res = await axios.get('/api/robots');
      setRobots(res.data);
    } catch (error) {
      console.error('Error fetching robots:', error);
    }
  };

  useEffect(() => {
    fetchRobots();
  }, []);

  // Calculate total time occupied by a robot in the month
  const calculateMonthlyTime = (robotName: string) => {
    const robotSchedules = robots.filter(r => r.name === robotName);
    let totalMinutes = 0;
    
    robotSchedules.forEach(schedule => {
      const start = new Date(`2024-01-01T${schedule.startTime}`);
      const end = new Date(`2024-01-01T${schedule.endTime}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      totalMinutes += duration;
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Get unique robots
  const uniqueRobots = [...new Set(robots.map(r => r.name))];

  // Add new robot
  const addRobot = async () => {
    try {
      if (newRobot.name && newRobot.startTime && newRobot.endTime) {
        if (newRobot.isDaily) {
          const promises = days.map(day =>
            axios.post('/api/robots', { ...newRobot, day, isDaily: false })
          );
          await Promise.all(promises);
        } else {
          await axios.post('/api/robots', { ...newRobot, day: selectedDay, isDaily: false });
        }

        await fetchRobots();
        setNewRobot({
          name: '',
          startTime: '',
          endTime: '',
          color: '#3B82F6',
          manual: false,
          isDaily: false
        });
        setShowAddRobot(false);
      }
    } catch (error) {
      console.error('Error adding robot:', error);
    }
  };

  // Remove robot
  const removeRobot = async (id: number) => {
    try {
      await axios.delete('/api/robots', { data: { id } });
      setRobots(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error removing robot:', error);
    }
  };

  // Toggle manual status
  const toggleManual = async (id: number) => {
    try {
      const robot = robots.find(r => r.id === id);
      if (robot) {
        await axios.put('/api/robots', { id, manual: !robot.manual });
        setRobots(robots.map(r => 
          r.id === id ? { ...r, manual: !r.manual } : r
        ));
      }
    } catch (error) {
      console.error('Error toggling manual status:', error);
      setRobots(robots.map(r => 
        r.id === id ? { ...r, manual: !r.manual } : r
      ));
    }
  };

  // Get robots for the selected day
  const getDayRobots = (day: number) => {
    return robots.filter(r => r.day === day);
  };

  // Check for time conflicts
  const hasTimeConflict = (day: number, startTime: string, endTime: string, excludeId: number | null = null, isDaily: boolean = false) => {
    const newStart = new Date(`2024-01-01T${startTime}`);
    const newEnd = new Date(`2024-01-01T${endTime}`);
    
    const checkConflict = (robotsToCheck: Robot[]): boolean =>
      robotsToCheck.some((robot: Robot) => {
        const existingStart = new Date(`2024-01-01T${robot.startTime}`);
        const existingEnd = new Date(`2024-01-01T${robot.endTime}`);
        return (newStart < existingEnd && newEnd > existingStart);
      });

    if (isDaily) {
      return days.some(d => {
        const dayRobots = robots.filter(r => r.day === d && r.id !== excludeId);
        return checkConflict(dayRobots);
      });
    }

    const dayRobots = robots.filter(r => r.day === day && r.id !== excludeId);
    return checkConflict(dayRobots);
  };

  // Calculate robot block height based on duration
  const calculateRobotHeight = (robot: Robot) => {
    const start = new Date(`2024-01-01T${robot.startTime}`);
    const end = new Date(`2024-01-01T${robot.endTime}`);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(durationHours * 60, 30);
  };

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => router.push('/robots')}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white border border-slate-600 rounded-xl hover:border-cyan-400 hover:text-cyan-400 transition-all"
        >
          <span className="text-xl">🤖</span>
        </button>
      </div>
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-20 blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 gap-8 h-full">
            {Array.from({ length: 144 }).map((_, i) => (
              <div 
                key={i} 
                className="border border-cyan-500/20 animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6 transition-all hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20">
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Organizador de Robôs
          </h1>
          <p className="text-slate-300">
            Gerencie seus robôs e horários durante o mês - Vista de linha do tempo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6 transition-all hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-cyan-400" />
                Controles
              </h2>
              
              {/* Day Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dia Selecionado
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {days.map(day => (
                    <option key={day} value={day} className="bg-slate-900">Dia {day}</option>
                  ))}
                </select>
              </div>

              {/* Add Robot Button */}
              <button
                onClick={() => setShowAddRobot(true)}
                className="group relative overflow-hidden w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:shadow-cyan-500/50 transition-all duration-300 "
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Robô
                </div>
              </button>
            </div>

            {/* Compact Calendar */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6 transition-all hover:border-cyan-400/50">
              <h3 className="text-lg font-bold text-white mb-4">Calendário</h3>
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dayRobots = getDayRobots(day);
                  const isSelected = day === selectedDay;
                  
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`
                        p-2 text-center cursor-pointer rounded-xl transition-all text-sm
                        ${isSelected 
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' 
                          : dayRobots.length > 0 
                            ? 'bg-slate-700/50 text-cyan-400 hover:bg-slate-600/50' 
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                        }
                      `}
                    >
                      {day}
                      {dayRobots.length > 0 && (
                        <div className="text-xs mt-1">
                          {dayRobots.length} robô{dayRobots.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 transition-all hover:border-cyan-400/50">
              <h3 className="text-lg font-bold text-white mb-4">Resumo Mensal</h3>
              {uniqueRobots.length === 0 ? (
                <p className="text-slate-400">Nenhum robô agendado</p>
              ) : (
                <div className="space-y-3">
                  {uniqueRobots.map(robotName => {
                    const robotColor = robots.find(r => r.name === robotName)?.color || '#3B82F6';
                    return (
                      <div key={robotName} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded mr-2"
                            style={{ backgroundColor: robotColor }}
                          ></div>
                          <span className="text-sm font-medium text-white">{robotName}</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {calculateMonthlyTime(robotName)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Daily Timeline */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 transition-all hover:border-cyan-400/50">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-cyan-400" />
                Timeline do Dia {selectedDay}
              </h2>
              
              <div className="relative">
                <div className="h-96 overflow-y-auto border border-slate-700/50 rounded-xl">
                  <div className="relative" style={{ height: '1440px' }}>
                    {hours.map(hour => (
                      <div key={hour} className="absolute w-full flex" style={{ top: `${hour * 60}px` }}>
                        <div className="w-16 flex-shrink-0 px-2 py-1 bg-slate-900/50 border-r border-slate-700/50">
                          <div className="text-sm font-medium text-slate-300">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                        </div>
                        
                        <div className="flex-1 relative">
                          <div className="h-px bg-slate-700/50 absolute top-0 w-full"></div>
                          
                          {getDayRobots(selectedDay)
                            .filter(robot => parseInt(robot.startTime.split(':')[0]) === hour)
                            .map((robot, index) => (
                              <div
                                key={robot.id}
                                className="absolute left-1 right-1 rounded-xl border-l-4 p-2 transition-all hover:shadow-cyan-500/20"
                                style={{
                                  backgroundColor: robot.color + '20',
                                  borderLeftColor: robot.color,
                                  top: `${parseInt(robot.startTime.split(':')[1])}px`,
                                  height: `${calculateRobotHeight(robot)}px`,
                                  zIndex: 10
                                }}
                              >
                                <div className="flex items-center justify-between h-full">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center">
                                      <div
                                        className="w-3 h-3 rounded mr-2 flex-shrink-0"
                                        style={{ backgroundColor: robot.color }}
                                      ></div>
                                      <span className="font-medium text-sm text-white truncate">
                                        {robot.name}
                                      </span>
                                      {robot.manual && (
                                        <Check className="w-4 h-4 ml-1 text-cyan-400 flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                      {robot.startTime} - {robot.endTime}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col space-y-1 ml-2">
                                    <button
                                      onClick={() => toggleManual(robot.id)}
                                      className={`
                                        px-2 py-1 rounded-xl text-xs font-medium transition-all
                                        ${robot.manual 
                                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' 
                                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                                        }
                                      `}
                                    >
                                      {robot.manual ? 'M' : 'A'}
                                    </button>
                                    
                                    <button
                                      onClick={() => removeRobot(robot.id)}
                                      className="text-red-400 hover:text-red-300 p-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                    
                    <div className="absolute w-full flex" style={{ top: '1440px' }}>
                      <div className="w-16 flex-shrink-0 px-2 py-1 bg-slate-900/50 border-r border-slate-700/50">
                        <div className="text-sm font-medium text-slate-300">24:00</div>
                      </div>
                      <div className="flex-1">
                        <div className="h-px bg-slate-700/50"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-400">
                <p><strong>Dica:</strong> Os robôs aparecem como blocos coloridos na timeline. 
                Use o scroll para navegar pelos horários. M = Manual, A = Automático.</p>
              </div>
            </div>

            {/* Scheduled Robots List */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mt-6 transition-all hover:border-cyan-400/50">
              <h3 className="text-lg font-bold text-white mb-4">
                Robôs Agendados - Dia {selectedDay}
              </h3>
              
              {getDayRobots(selectedDay).length === 0 ? (
                <p className="text-slate-400">Nenhum robô agendado para este dia</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getDayRobots(selectedDay)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(robot => (
                      <div
                        key={robot.id}
                        className="flex items-center justify-between p-3 rounded-xl border-l-4 transition-all hover:scale-105"
                        style={{ borderLeftColor: robot.color, backgroundColor: robot.color + '10' }}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: robot.color }}
                          ></div>
                          <div>
                            <div className="font-medium text-white">{robot.name}</div>
                            <div className="text-sm text-slate-400 flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {robot.startTime} - {robot.endTime}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {robot.manual && (
                            <span className="text-cyan-400 text-xs font-medium">
                              Manual ✓
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Robot Modal */}
        {showAddRobot && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md border border-slate-700/50 transition-all hover:border-cyan-400/50">
              <h3 className="text-lg font-bold text-white mb-4">
                Adicionar Robô {newRobot.isDaily ? '- Todos os Dias' : `- Dia ${selectedDay}`}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nome do Robô
                  </label>
                  <input
                    type="text"
                    value={newRobot.name}
                    onChange={(e) => setNewRobot({...newRobot, name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Ex: Robô Vendas"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Hora Início
                    </label>
                    <input
                      type="time"
                      value={newRobot.startTime}
                      onChange={(e) => setNewRobot({...newRobot, startTime: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Hora Fim
                    </label>
                    <input
                      type="time"
                      value={newRobot.endTime}
                      onChange={(e) => setNewRobot({...newRobot, endTime: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cor do Robô
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewRobot({...newRobot, color})}
                        className={`
                          w-8 h-8 rounded-xl border-2 transition-all
                          ${newRobot.color === color 
                            ? 'border-cyan-400 scale-110' 
                            : 'border-slate-700/50'
                          }
                        `}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="manual"
                    checked={newRobot.manual}
                    onChange={(e) => setNewRobot({...newRobot, manual: e.target.checked})}
                    className="mr-2 accent-cyan-500"
                  />
                  <label htmlFor="manual" className="text-sm text-slate-300">
                    Marcar como manual
                  </label>
                </div>

                <div className="flex items-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                  <input
                    type="checkbox"
                    id="isDaily"
                    checked={newRobot.isDaily}
                    onChange={(e) => setNewRobot({...newRobot, isDaily: e.target.checked})}
                    className="mr-3 accent-cyan-500"
                  />
                  <label htmlFor="isDaily" className="text-sm text-cyan-400 font-medium">
                    🗓️ Robô diário (aplicar a todos os 28 dias)
                  </label>
                </div>
              </div>
              
              {hasTimeConflict(selectedDay, newRobot.startTime, newRobot.endTime, null, newRobot.isDaily) && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-700/50 rounded-xl">
                  <p className="text-sm text-red-400">
                    ⚠️ Conflito de horário detectado {newRobot.isDaily ? 'em um ou mais dias' : 'neste dia'}.
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddRobot(false)}
                  className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 hover:bg-slate-800/50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={addRobot}
                  disabled={!newRobot.name || !newRobot.startTime || !newRobot.endTime}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {newRobot.isDaily ? 'Adicionar a Todos os Dias' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.2; }
          50% { opacity: 0.4; }
          100% { opacity: 0.2; }
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default RobotScheduler;