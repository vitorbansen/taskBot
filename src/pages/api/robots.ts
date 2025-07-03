import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const robots = await prisma.robot.findMany();
      return res.status(200).json(robots);
    }

    if (req.method === 'POST') {
      const { name, startTime, endTime, color, manual, day } = req.body;

      if (!name || !startTime || !endTime || !color || typeof day !== 'number') {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
      }

      const robot = await prisma.robot.create({
        data: { name, startTime, endTime, color, manual, day }
      });

      return res.status(201).json(robot);
    }

    if (req.method === 'PUT') {
      const { id, ...data } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID do robô é obrigatório para atualizar' });
      }

      const updatedRobot = await prisma.robot.update({
        where: { id },
        data
      });

      return res.status(200).json(updatedRobot);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID do robô é obrigatório' });
      }

      await prisma.robot.delete({ where: { id } });
      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Erro na API de robôs:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
