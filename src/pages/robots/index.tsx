'use client'

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Clock, Calendar, Settings, Trash2, Check, Edit2 } from 'lucide-react';
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
  description?: string;
}

const DESCRIPTION_LIMIT = 80;

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
    isDaily: false,
    description: ''
  });

  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [descriptionEditingRobot, setDescriptionEditingRobot] = useState<Robot | null>(null);
  const [tempDescription, setTempDescription] = useState('');

  // Cores predefinidas para os robôs
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F43F5E',
    '#34D399', '#818CF8', '#FB7185', '#FACC15'
  ];

  // Gerar dias do mês (1-30)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  // Gerar horários do dia (0-23h)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Buscar robôs do backend
  const fetchRobots = async () => {
    try {
      const res = await axios.get('/api/robots');
      setRobots(res.data);
    } catch (error) {
      console.error('Erro ao buscar robôs:', error);
    }
  };

  useEffect(() => {
    fetchRobots();
  }, []);

  // Calcular tempo total ocupado por robô no mês
  const calculateMonthlyTime = (robotName: string) => {
    const robotSchedules = robots.filter(r => r.name === robotName);
    let totalMinutes = 0;
    
    robotSchedules.forEach(schedule => {
      const start = new Date(`2024-01-01T${schedule.startTime}`);
      const end = new Date(`2024-01-01T${schedule.endTime}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60); // em minutos
      totalMinutes += duration;
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Obter robôs únicos
  const uniqueRobots = [...new Set(robots.map(r => r.name))];

  // Adicionar novo robô
  const addRobot = async () => {
    try {
      if (newRobot.name && newRobot.startTime && newRobot.endTime) {
        if (newRobot.isDaily) {
          // Criar robô para todos os dias
          const promises = days.map(day =>
            axios.post('/api/robots', { ...newRobot, day, isDaily: false })
          );
          await Promise.all(promises);
        } else {
          // Criar robô apenas para o dia selecionado
          await axios.post('/api/robots', { ...newRobot, day: selectedDay, isDaily: false });
        }

        await fetchRobots();
        setNewRobot({
          name: '',
          startTime: '',
          endTime: '',
          color: '#3B82F6',
          manual: false,
          isDaily: false,
          description: ''
        });
        setShowAddRobot(false);
      }
    } catch (error) {
      console.error('Erro ao adicionar robô:', error);
    }
  };

  // Remover robô
  const removeRobot = async (id: number) => {
    try {
      await axios.delete('/api/robots', { data: { id } });
      setRobots(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Erro ao remover robô:', error);
    }
  };

  // Alternar status manual
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
      console.error('Erro ao alterar status manual:', error);
      // Fallback para atualização local
      setRobots(robots.map(r => 
        r.id === id ? { ...r, manual: !r.manual } : r
      ));
    }
  };

  // Abrir modal descrição
  const openDescriptionModal = (robot: Robot) => {
    setDescriptionEditingRobot(robot);
    setTempDescription(robot.description || '');
    setShowDescriptionModal(true);
  };

  // Obter robôs do dia selecionado
  const getDayRobots = (day: number) => {
    return robots.filter(r => r.day === day);
  };

  // Verificar se há conflito de horário
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

  // Calcular altura do bloco do robô baseado na duração
  const calculateRobotHeight = (robot: Robot) => {
    const start = new Date(`2024-01-01T${robot.startTime}`);
    const end = new Date(`2024-01-01T${robot.endTime}`);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(durationHours * 60, 30); // mínimo 30px
  };

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="fixed top-4 left-4 z-50">
        {/* <button
          onClick={() => router.push('/robots/darkmode')}
          className="flex items-center space-x-2 px-4 py-2 bg-white text-white border border-slate-600 rounded-xl hover:border-cyan-400 hover:text-cyan-400 transition-all"
        >
          <span className="text-xl">🌚</span>
        </button> */}
      </div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Organizador de Robôs
          </h1>
          <p className="text-gray-600">
            Gerencie seus robôs e horários durante o mês - Vista de linha do tempo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Painel de Controle */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Controles
              </h2>
              
              {/* Seletor de Dia */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia Selecionado
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {days.map(day => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
              </div>

              {/* Botão Adicionar Robô */}
              <button
                onClick={() => setShowAddRobot(true)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Robô
              </button>
            </div>

            {/* Calendário Compacto */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Calendário</h3>
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dayRobots = getDayRobots(day);
                  const isSelected = day === selectedDay;
                  
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={
                        `p-2 text-center cursor-pointer rounded transition-all text-sm
                        ${isSelected 
                          ? 'bg-blue-600 text-white' 
                          : dayRobots.length > 0 
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`
                      }
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

            {/* Resumo Mensal */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Resumo Mensal</h3>
              {uniqueRobots.length === 0 ? (
                <p className="text-gray-500">Nenhum robô agendado</p>
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
                          <span className="text-sm font-medium">{robotName}</span>
                        </div>
                        <span className="text-xs text-gray-600">
                          {calculateMonthlyTime(robotName)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Timeline Vertical do Dia */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Timeline do Dia {selectedDay}
              </h2>
              
              <div className="relative">
                {/* Container da timeline com scroll */}
                <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="relative" style={{ height: '1440px' }}> {/* 24h * 60px */}
                    
                    {/* Linhas de horário */}
                    {hours.map(hour => (
                      <div key={hour} className="absolute w-full flex" style={{ top: `${hour * 60}px` }}>
                        {/* Coluna de horários */}
                        <div className="w-16 flex-shrink-0 px-2 py-1 bg-gray-50 border-r border-gray-200">
                          <div className="text-sm font-medium text-gray-700">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                        </div>
                        
                        {/* Área de conteúdo */}
                        <div className="flex-1 relative">
                          <div className="h-px bg-gray-200 absolute top-0 w-full"></div>
                          
                          {/* Robôs que começam neste horário */}
                          {getDayRobots(selectedDay)
                            .filter(robot => parseInt(robot.startTime.split(':')[0]) === hour)
                            .map((robot, index) => (
                              <div
                                key={robot.id}
                                className="absolute left-1 right-1 rounded-md shadow-sm border-l-4 p-2"
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
                                      <span className="font-medium text-sm truncate">
                                        {robot.name}
                                      </span>
                                      {robot.manual && (
                                        <Check className="w-4 h-4 ml-1 text-green-600 flex-shrink-0" />
                                      )}
                                      {/* Botão para editar descrição */}
                                      <button
                                        onClick={() => openDescriptionModal(robot)}
                                        className="ml-2 text-blue-600 hover:text-blue-800"
                                        title="Editar descrição"
                                        type="button"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                    {robot.description && (
                                      <div
                                        className="text-xs text-gray-500 mt-1 truncate"
                                        title={robot.description}
                                      >
                                         {robot.description}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-600 mt-1">
                                      {robot.startTime} - {robot.endTime}
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col space-y-1 ml-2">
                                    <button
                                      onClick={() => toggleManual(robot.id)}
                                      className={
                                        `px-2 py-1 rounded text-xs font-medium transition-colors
                                        ${robot.manual 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                        }`
                                      }
                                    >
                                      {robot.manual ? 'M' : 'A'}
                                    </button>
                                    
                                    <button
                                      onClick={() => removeRobot(robot.id)}
                                      className="text-red-600 hover:text-red-800 p-1"
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
                    
                    {/* Linha final */}
                    <div className="absolute w-full flex" style={{ top: '1440px' }}>
                      <div className="w-16 flex-shrink-0 px-2 py-1 bg-gray-50 border-r border-gray-200">
                        <div className="text-sm font-medium text-gray-700">24:00</div>
                      </div>
                      <div className="flex-1">
                        <div className="h-px bg-gray-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legenda */}
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Dica:</strong> Os robôs aparecem como blocos coloridos na timeline. 
                Use o scroll para navegar pelos horários. M = Manual, A = Automático.</p>
              </div>
            </div>

            {/* Lista de Robôs do Dia */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">
                Robôs Agendados - Dia {selectedDay}
              </h3>
              
              {getDayRobots(selectedDay).length === 0 ? (
                <p className="text-gray-500">Nenhum robô agendado para este dia</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getDayRobots(selectedDay)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(robot => (
                      <div
                        key={robot.id}
                        className="flex items-center justify-between p-3 rounded-lg border-l-4"
                        style={{ borderColor: robot.color, backgroundColor: robot.color + '20' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{robot.name}</div>
                          <div className="text-xs text-gray-700">
                            {robot.startTime} - {robot.endTime}
                          </div>
                          {robot.description && (
                            <div className="text-xs text-gray-500 mt-1 truncate" title={robot.description}>
                              {robot.description}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col space-y-1 ml-4">
                          <button
                            onClick={() => toggleManual(robot.id)}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors
                              ${robot.manual
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                              }`}
                          >
                            {robot.manual ? 'M' : 'A'}
                          </button>
                          <button
                            onClick={() => openDescriptionModal(robot)}
                            className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded text-xs font-semibold"
                            type="button"
                          >
                          <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeRobot(robot.id)}
                            className="text-red-600 hover:text-red-800 px-3 py-1 rounded text-xs font-semibold"
                          >
                           <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Robô */}
      {showAddRobot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Robô</h3>

            <input
              type="text"
              className="w-full p-2 mb-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do Robô"
              value={newRobot.name}
              onChange={e => setNewRobot({ ...newRobot, name: e.target.value })}
            />

            <label className="block mb-1 font-medium text-gray-700">Início</label>
            <input
              type="time"
              className="w-full p-2 mb-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newRobot.startTime}
              onChange={e => setNewRobot({ ...newRobot, startTime: e.target.value })}
            />

            <label className="block mb-1 font-medium text-gray-700">Fim</label>
            <input
              type="time"
              className="w-full p-2 mb-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newRobot.endTime}
              onChange={e => setNewRobot({ ...newRobot, endTime: e.target.value })}
            />

            <label className="block mb-1 font-medium text-gray-700">Cor</label>
             <div className="flex flex-wrap gap-2 mb-3">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewRobot({ ...newRobot, color })}
                  className={`w-8 h-8 rounded-full border-2 focus:outline-none ${
                    newRobot.color === color ? 'border-blue-600' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Selecionar cor ${color}`}
                />
              ))}
            </div>

            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={newRobot.manual}
                onChange={e => setNewRobot({ ...newRobot, manual: e.target.checked })}
                className="mr-2"
              />
              Manual (M)
            </label>

            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={newRobot.isDaily}
                onChange={e => setNewRobot({ ...newRobot, isDaily: e.target.checked })}
                className="mr-2"
              />
              Repetir para todos os dias
            </label>

              {hasTimeConflict(selectedDay, newRobot.startTime, newRobot.endTime, null, newRobot.isDaily) && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
                <p className="text-sm text-red-700">
                  ⚠️ Conflito de horário detectado {newRobot.isDaily ? 'em um ou mais dias' : 'neste dia'}.
                </p>
              </div>
            )}

            <label className="block mb-1 font-medium text-gray-700">Descrição</label>
            <textarea
              value={newRobot.description}
              onChange={e => {
                if (e.target.value.length <= DESCRIPTION_LIMIT) {
                  setNewRobot({ ...newRobot, description: e.target.value });
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
              placeholder="Descrição do robô"
              rows={3}
            />
            <div className="text-right text-xs text-gray-500 mb-3">
              {newRobot.description.length} / {DESCRIPTION_LIMIT}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddRobot(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={addRobot}
                disabled={!newRobot.name || !newRobot.startTime || !newRobot.endTime}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Descrição */}
      {showDescriptionModal && descriptionEditingRobot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Descrição do Robô - {descriptionEditingRobot.name} (Dia {descriptionEditingRobot.day})
            </h3>

            <textarea
              className="w-full h-24 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tempDescription}
              onChange={(e) => {
                if (e.target.value.length <= DESCRIPTION_LIMIT) {
                  setTempDescription(e.target.value);
                }
              }}
              placeholder="Digite a descrição/comentário do robô aqui..."
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {tempDescription.length} / {DESCRIPTION_LIMIT}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  try {
                    // Atualiza descrição no backend
                    await axios.put('/api/robots', {
                      id: descriptionEditingRobot.id,
                      description: tempDescription,
                    });
                    // Atualiza local
                    setRobots(robots.map(r =>
                      r.id === descriptionEditingRobot.id
                        ? { ...r, description: tempDescription }
                        : r
                    ));
                    setShowDescriptionModal(false);
                  } catch (error) {
                    console.error('Erro ao atualizar descrição:', error);
                  }
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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

export default RobotScheduler;
