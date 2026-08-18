import { Router } from 'express';
import {
    getAllPayments,
    getPaymentDetails,
    issueRefund,
    getCodCollections,
    reconcileOrderPayment,
} from '../modules/admin/controllers/adminPaymentController';

const router = Router();

// Payment management
router.get('/', getAllPayments);
router.get('/cod-collections', getCodCollections);
router.get('/:id', getPaymentDetails);
router.post('/:id/refund', issueRefund);
router.post('/orders/:orderId/reconcile', reconcileOrderPayment);

export default router;
