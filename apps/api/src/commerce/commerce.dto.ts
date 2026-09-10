import{BillingPeriod,PaymentEventType}from'@prisma/client';import{IsEnum,IsString,Length}from'class-validator';
export class AddCartItemDto{@IsString()packageId!:string;@IsEnum(BillingPeriod)period!:BillingPeriod;@IsString()@Length(2,2)countryCode!:string;@IsString()@Length(3,3)currency!:string;}
export class SimulatePaymentDto{@IsEnum(PaymentEventType)type!:PaymentEventType;}
export class PaymentWebhookDto{@IsString()externalId!:string;@IsString()orderId!:string;@IsEnum(PaymentEventType)type!:PaymentEventType;}
export class RegisterDeviceDto{@IsString()@Length(1,120)deviceId!:string;@IsString()@Length(1,80)label!:string;}
