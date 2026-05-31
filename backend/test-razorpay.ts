import Razorpay from 'razorpay';

async function test() {
    try {
        const razorpay = new Razorpay({
            key_id: 'rzp_test_S2tOuYBZiOuLb4',
            key_secret: 'tiR3NbQKSBa5mrdKyZbsnh7x',
        });

        const options = {
            amount: 10000, // 100 INR
            currency: 'INR',
            receipt: 'test_order_12345678901234',
            notes: {
                orderId: 'test_order_12345678901234',
            },
        };

        const order = await razorpay.orders.create(options);
        console.log("Success:", order);
    } catch (e: any) {
        console.error("Error:", e.error || e.message || e);
    }
}

test();
