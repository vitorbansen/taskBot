'use client'

import React, { useState, useEffect } from 'react';
import { Plus, Clock, Calendar, Trash2, Check, Edit2, Activity, BarChart3, Users } from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';


interface Robot {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  manual: boolean;
  day: number;
  isDaily?: boolean;
  description?: string;
}

interface GroupedRobot {
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  manual: boolean;
  days: number[];
  ids: number[];
  description?: string;
  isDaily?: boolean;
}

const DESCRIPTION_LIMIT = 120;

const calculateWeek = (dayOfMonth: number): number => {
  if (dayOfMonth >= 1 && dayOfMonth <= 7) return 1;
  if (dayOfMonth >= 8 && dayOfMonth <= 14) return 2;
  if (dayOfMonth >= 15 && dayOfMonth <= 21) return 3;
  if (dayOfMonth >= 22 && dayOfMonth <= 28) return 4;
  return 1;
};



const WeeklyRobotPlanner: React.FC = () => {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [showAddRobot, setShowAddRobot] = useState(false);
  const [descriptionEditingRobot, setDescriptionEditingRobot] = useState<Robot | null>(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [tempDescription, setTempDescription] = useState('');

  const [newRobot, setNewRobot] = useState<Omit<Robot, 'id'>>({
    name: '',
    startTime: '',
    endTime: '',
    color: '#3B82F6',
    manual: false,
    day: 1,
    isDaily: false,
    description: ''
  });

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F43F5E',
    '#34D399', '#818CF8', '#FB7185', '#FACC15'
  ];

  const weeks = [1, 2, 3, 4];
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  const loadRobots = async () => {
    try {
      const response = await axios.get<Robot[]>('/api/robots');
      setRobots(response.data);
    } catch (error) {
      console.error('Erro ao carregar robôs da API:', error);
    }
  };

  const saveRobots = (robotsData: Robot[]) => {
    try {
      localStorage.setItem('weeklyRobots', JSON.stringify(robotsData));
    } catch (error) {
      console.error('Erro ao salvar robôs:', error);
    }
  };

  useEffect(() => {
    loadRobots();
  }, []);

  const groupRobots = (robots: Robot[]): GroupedRobot[] => {
    const grouped = new Map<string, GroupedRobot>();
    robots.forEach(robot => {
      const key = `${robot.name}-${robot.startTime}-${robot.endTime}-${robot.color}-${robot.manual}-${robot.description || ''}-${robot.isDaily || false}`;
      const existing = grouped.get(key);
      if (existing) {
        if (!existing.days.includes(robot.day)) {
          existing.days.push(robot.day);
          existing.ids.push(robot.id);
        }
      } else {
        grouped.set(key, {
          name: robot.name,
          startTime: robot.startTime,
          endTime: robot.endTime,
          color: robot.color,
          manual: robot.manual,
          days: [robot.day],
          ids: [robot.id],
          description: robot.description,
          isDaily: robot.isDaily
        });
      }
    });
    return Array.from(grouped.values()).map(group => ({
      ...group,
      days: group.days.sort((a, b) => a - b)
    }));
  };

  const getWeekRobots = (week: number): GroupedRobot[] => {
    const weekRobots = robots.filter(r => calculateWeek(r.day) === week || r.isDaily);
    return groupRobots(weekRobots);
  };

  const getTotalRobots = () => robots.length;
  const getActiveRobots = () => robots.filter(r => r.manual).length;

  const hasTimeConflict = (day: number, startTime: string, endTime: string, excludeId: number | null = null, isDaily: boolean = false) => {
    const newStart = new Date(`2025-08-01T${startTime}`);
    const newEnd = new Date(`2025-08-01T${endTime}`);
    
    const checkConflict = (robotsToCheck: Robot[]): boolean =>
      robotsToCheck.some((robot: Robot) => {
        const existingStart = new Date(`2025-08-01T${robot.startTime}`);
        const existingEnd = new Date(`2025-08-01T${robot.endTime}`);
        return (newStart < existingEnd && newEnd > existingStart);
      });

    if (isDaily) {
      return days.some(d => {
        const dayRobots = robots.filter(r => (r.day === d || r.isDaily) && r.id !== excludeId);
        return checkConflict(dayRobots);
      });
    }

    const dayRobots = robots.filter(r => (r.day === day || r.isDaily) && r.id !== excludeId);
    return checkConflict(dayRobots);
  };

  const addRobot = async () => {
    try {
      if (newRobot.name && newRobot.startTime && newRobot.endTime) {
        if (hasTimeConflict(newRobot.day, newRobot.startTime, newRobot.endTime, null, newRobot.isDaily)) {
          alert('Conflito de horário detectado!');
          return;
        }

        if (newRobot.isDaily) {
          const promises = days.map(day =>
            axios.post('/api/robots', { ...newRobot, day, isDaily: false })
          );
          await Promise.all(promises);
        } else {
          await axios.post('/api/robots', { ...newRobot, day: newRobot.day, isDaily: false });
        }

        await loadRobots();
        setNewRobot({
          name: '',
          startTime: '',
          endTime: '',
          color: '#3B82F6',
          manual: false,
          day: 1,
          isDaily: false,
          description: ''
        });
        setShowAddRobot(false);
      }
    } catch (error) {
      console.error('Erro ao adicionar robô:', error);
    }
  };

  const removeRobot = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(id => axios.delete('/api/robots', { data: { id } })));
      setRobots(prev => prev.filter(r => !ids.includes(r.id)));
      saveRobots(robots.filter(r => !ids.includes(r.id)));
    } catch (error) {
      console.error('Erro ao remover robô:', error);
    }
  };

  const toggleManual = async (ids: number[]) => {
    try {
      const robot = robots.find(r => ids.includes(r.id));
      if (robot) {
        await Promise.all(ids.map(id => 
          axios.put('/api/robots', { id, manual: !robot.manual })
        ));
        const updatedRobots = robots.map(r =>
          ids.includes(r.id) ? { ...r, manual: !robot.manual } : r
        );
        setRobots(updatedRobots);
        saveRobots(updatedRobots);
      }
    } catch (error) {
      console.error('Erro ao alterar status manual:', error);
      setRobots(robots.map(r =>
        ids.includes(r.id) ? { ...r, manual: !r.manual } : r
      ));
      saveRobots(robots.map(r =>
        ids.includes(r.id) ? { ...r, manual: !r.manual } : r
      ));
    }
  };

  const openDescriptionModal = (robot: GroupedRobot) => {
    const originalRobot = robots.find(r => r.id === robot.ids[0]);
    if (originalRobot) {
      setDescriptionEditingRobot(originalRobot);
      setTempDescription(originalRobot.description || '');
      setShowDescriptionModal(true);
    }
  };

  const saveDescription = async () => {
    if (descriptionEditingRobot) {
      try {
        await axios.put('/api/robots', {
          id: descriptionEditingRobot.id,
          description: tempDescription
        });
        const updatedRobots = robots.map(r =>
          r.id === descriptionEditingRobot.id
            ? { ...r, description: tempDescription }
            : r
        );
        setRobots(updatedRobots);
        saveRobots(updatedRobots);
        setShowDescriptionModal(false);
        setDescriptionEditingRobot(null);
        setTempDescription('');
      } catch (error) {
        console.error('Erro ao atualizar descrição:', error);
      }
    }
  };

  const uniqueRobots = [...new Set(robots.map(r => r.name))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Planner de Robôs
                </h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  Organize seus robôs por semanas - Estilo Teams
                </p>
              </div> 
            </div>
           <Link href="/robots" className="flex items-center space-x-2 px-4 py-2 font-bold bg-white text-blue-700 border border-slate-600 rounded-xl hover:border-cyan-400 hover:text-cyan-400 transition-all">
           <span className="text-xl">Time Line</span>
         </Link>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="bg-blue-50 px-4 sm:px-6 py-4 rounded-xl border border-blue-100">
                <div className="flex items-center space-x-3">
                  <Activity className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="text-sm text-blue-600 font-medium">Total Robôs</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-900">{getTotalRobots()}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 px-4 sm:px-6 py-4 rounded-xl border border-green-100">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="text-sm text-green-600 font-medium">Ativos</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-900">{getActiveRobots()}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAddRobot(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 font-medium shadow-lg w-full sm:w-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Novo Robô</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {weeks.map(week => {
            const weekRobots = getWeekRobots(week);
            
            return (
              <div key={week} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-600 w-3 h-3 rounded-full"></div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Semana {week}
                      </h3>
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                      {weekRobots.length} robô{weekRobots.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1">
                    {week === 1 && "1-7 do mês"}
                    {week === 2 && "8-14 do mês"}
                    {week === 3 && "15-21 do mês"}
                    {week === 4 && "22-28 do mês"}
                  </p>
                </div>

                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto overflow-x-hidden">
                  {weekRobots.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm">Nenhum robô agendado</p>
                      <p className="text-gray-400 text-xs mt-1">para esta semana</p>
                    </div>
                  ) : (
                    weekRobots.map(robot => (
                      <div
                        key={`${robot.name}-${robot.startTime}-${robot.endTime}`}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 group"
                        style={{
                          borderLeftColor: robot.color,
                          borderLeftWidth: '4px'
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: robot.color }}
                            ></div>
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {robot.name}
                            </h4>
                            {robot.manual && (
                              <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                Manual
                              </div>
                            )}
                            {robot.isDaily && (
                              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                Diário
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleManual(robot.ids)}
                              className={`p-2 rounded transition-colors ${
                                robot.manual 
                                  ? 'text-green-600 hover:bg-green-50' 
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                              title={robot.manual ? 'Modo Manual' : 'Modo Automático'}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => openDescriptionModal(robot)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar descrição"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => removeRobot(robot.ids)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remover robô"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span className="font-medium">
                              {robot.isDaily ? 'Diário' : `Dias ${robot.days.join(', ')}`}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>{robot.startTime} - {robot.endTime}</span>
                          </div>
                          
                          {robot.description && (
                            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-2">
                              {robot.description.length > 60 
                                ? `${robot.description.substring(0, 60)}...` 
                                : robot.description
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 sm:mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600 mr-2" />
            Resumo Geral dos Robôs
          </h3>
          
          {uniqueRobots.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">Nenhum robô configurado ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {uniqueRobots.map(robotName => {
                const robotInstances = robots.filter(r => r.name === robotName);
                const robotColor = robotInstances[0]?.color || '#3B82F6';
                const weekCount = [...new Set(robotInstances.map(r => calculateWeek(r.day)))].length;
                
                return (
                  <div key={robotName} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center mb-3">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: robotColor }}
                      ></div>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{robotName}</span>
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Agendamentos:</span>
                        <span className="font-medium">{robotInstances.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Semanas:</span>
                        <span className="font-medium">{weekCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddRobot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Adicionar Novo Robô</h3>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">Configure os detalhes do seu robô</p>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Robô
                </label>
                <input
                  type="text"
                  value={newRobot.name}
                  onChange={(e) => setNewRobot({...newRobot, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Ex: Robô de Limpeza"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dia do Mês (1-30)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newRobot.day}
                    onChange={(e) => setNewRobot({...newRobot, day: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={newRobot.isDaily}
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newRobot.isDaily}
                      onChange={(e) => setNewRobot({...newRobot, isDaily: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Repetir para todos os dias</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Início
                  </label>
                  <input
                    type="time"
                    value={newRobot.startTime}
                    onChange={(e) => setNewRobot({...newRobot, startTime: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fim
                  </label>
                  <input
                    type="time"
                    value={newRobot.endTime}
                    onChange={(e) => setNewRobot({...newRobot, endTime: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {hasTimeConflict(newRobot.day, newRobot.startTime, newRobot.endTime, null, newRobot.isDaily) && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
                  <p className="text-xs sm:text-sm text-red-700">
                    ⚠️ Conflito de horário detectado {newRobot.isDaily ? 'em um ou mais dias' : 'neste dia'}.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor do Robô
                </label>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewRobot({...newRobot, color})}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 focus:outline-none ${newRobot.color === color ? 'border-black' : 'border-transparent'}`}
                      style={{backgroundColor: color}}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="manual-checkbox"
                  type="checkbox"
                  checked={newRobot.manual}
                  onChange={(e) => setNewRobot({...newRobot, manual: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="manual-checkbox" className="text-sm text-gray-700">
                  Modo Manual
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={newRobot.description}
                  onChange={(e) => {
                    if (e.target.value.length <= DESCRIPTION_LIMIT) {
                      setNewRobot({...newRobot, description: e.target.value});
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Digite a descrição do robô (máx. 120 caracteres)"
                  rows={3}
                />
                <p className="text-right text-xs text-gray-500 mt-1">
                  {(newRobot.description ?? '').length} / {DESCRIPTION_LIMIT}
                </p>
              </div>
            </div>

            <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 space-x-3">
              <button
                onClick={() => setShowAddRobot(false)}
                className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={addRobot}
                disabled={!newRobot.name || !newRobot.startTime || !newRobot.endTime}
                className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDescriptionModal && descriptionEditingRobot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Editar Descrição - {descriptionEditingRobot.name}</h3>
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
                aria-label="Fechar modal"
              >
                &times;
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <textarea
                value={tempDescription}
                onChange={(e) => {
                  if (e.target.value.length <= DESCRIPTION_LIMIT) {
                    setTempDescription(e.target.value);
                  }
                }}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                rows={6}
                placeholder="Digite a descrição do robô (máx. 120 caracteres)"
              />
              <p className="text-right text-xs text-gray-500 mt-1">
                {tempDescription.length} / {DESCRIPTION_LIMIT}
              </p>
            </div>
            <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 space-x-3">
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={saveDescription}
                className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-sm"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyRobotPlanner;

