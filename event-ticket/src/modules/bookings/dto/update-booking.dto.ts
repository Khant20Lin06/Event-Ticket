import { PartialType } from "@nestjs/swagger";
import { CheckoutBookingDto } from "./checkout-booking.dto";

export class UpdateBookingDto extends PartialType(CheckoutBookingDto) { }