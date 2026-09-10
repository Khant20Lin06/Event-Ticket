import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateCampaignDto, GenerateMotionPassDto } from './dto/generate-campaign.dto';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('generate-campaign')
    @HttpCode(HttpStatus.OK)
    async generateCampaign(@Body() dto: GenerateCampaignDto) {
        return this.aiService.generateCampaign(dto);
    }

    @Post('generate-motion-pass')
    @HttpCode(HttpStatus.OK)
    async generateMotionPass(@Body() dto: GenerateMotionPassDto) {
        return this.aiService.generateMotionPass(dto);
    }

    @Post('mcp/invoke')
    @HttpCode(HttpStatus.OK)
    async invokeMcp(@Body() body: { server: 'supabase' | 'layers'; method: string; params?: any }) {
        return this.aiService.invokeMcpTool(body.server, body.method, body.params);
    }
}
