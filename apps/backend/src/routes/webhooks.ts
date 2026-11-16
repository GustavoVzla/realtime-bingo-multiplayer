import { Router, type Request, type Response } from 'express';

export const router: Router = Router();

router.post('/n8n', async (req: Request, res: Response): Promise<void> => {
  console.log('N8N Webhook received:', req.body);
  res.json({ success: true, message: 'Webhook received' });
});
