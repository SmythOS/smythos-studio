import express from 'express';
import { submitFeedbackForm } from '../../../services/hubspot.service';

const router = express.Router();

router.post('/submit', async (req, res) => {
  try {
    const { feedbackData, userEmail } = req.body;
    const result = await submitFeedbackForm(feedbackData, userEmail);

    if (!result) {
      return res.status(400).json({ success: false, error: 'Failed to submit feedback' });
    }

    // Return standardized success response
    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in feedback submission:', error?.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export const feedbackRouter = router;
