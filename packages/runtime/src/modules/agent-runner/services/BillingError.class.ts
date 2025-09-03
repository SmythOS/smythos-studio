export class BillingError extends Error {
    code: string;
    status: number;

    constructor(message: string, code: string = 'BILLING_LIMIT_REACHED', status: number = 402) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'BillingError';

        // Fix prototype chain for proper instanceof behavior with custom Error classes
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
