import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CheckoutBookingDto {
    @IsUUID()
    @IsNotEmpty()
    bookingId: string;

    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    paymentMethod: string;
}
