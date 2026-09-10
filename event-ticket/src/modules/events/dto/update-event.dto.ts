import { CreateEventDto } from "./create-event.dto";
import { PartialType } from "@nestjs/swagger";

export class UpdateEventDto extends PartialType(CreateEventDto) { }