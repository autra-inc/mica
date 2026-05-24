import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { buildPrompt, PROMPT_IDS } from '@/lib/prompts';
import {
  extractHtml,
  extractWidgetConfig,
  generateWidgetTeacherActions,
} from '@/lib/generation/scene-generator';
import { postProcessInteractiveHtml } from '@/lib/generation/interactive-post-processor';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import type { WidgetType, WidgetConfig } from '@/lib/types/widgets';
import type {
  SimulationConfig,
  DiagramConfig,
  CodeConfig,
  GameConfig,
  Visualization3DConfig,
} from '@/lib/types/widgets';
import type { AICallFn } from '@/lib/generation/pipeline-types';

export const maxDuration = 300;

function buildRegenerateVariables(
  widgetType: WidgetType,
  widgetConfig: WidgetConfig | undefined,
  instruction: string,
  languageDirective: string,
): Record<string, unknown> {
  const base = { languageDirective };
  switch (widgetType) {
    case 'simulation': {
      const cfg = widgetConfig as SimulationConfig | undefined;
      return {
        ...base,
        conceptName: cfg?.concept || '',
        conceptOverview: cfg?.description || '',
        keyPoints: '',
        variables: cfg?.variables?.map((v) => v.name).join(', ') || '',
        designIdea: `Modification request: ${instruction}`,
      };
    }
    case 'diagram': {
      const cfg = widgetConfig as DiagramConfig | undefined;
      return {
        ...base,
        title: cfg?.description || '',
        diagramType: cfg?.diagramType || 'flowchart',
        description: `Modification request: ${instruction}`,
        keyPoints: '',
      };
    }
    case 'code': {
      const cfg = widgetConfig as CodeConfig | undefined;
      return {
        ...base,
        title: cfg?.description || '',
        programmingLanguage: cfg?.language || 'python',
        description: `Modification request: ${instruction}`,
        keyPoints: '',
        starterCode: cfg?.starterCode || '',
        testCases: '',
        hints: '',
      };
    }
    case 'game': {
      const cfg = widgetConfig as GameConfig | undefined;
      return {
        ...base,
        title: cfg?.description || '',
        gameType: cfg?.gameType || 'quiz',
        description: `Modification request: ${instruction}`,
        keyPoints: '',
        scoring: cfg?.scoring || { correctPoints: 10, speedBonus: 5 },
      };
    }
    case 'visualization3d': {
      const cfg = widgetConfig as Visualization3DConfig | undefined;
      return {
        ...base,
        title: cfg?.description || '',
        visualizationType: cfg?.visualizationType || 'custom',
        description: `Modification request: ${instruction}`,
        keyPoints: '',
        objects: cfg?.objects || [],
        interactions: cfg?.interactions || [],
      };
    }
  }
}

const WIDGET_PROMPT_ID: Record<WidgetType, (typeof PROMPT_IDS)[keyof typeof PROMPT_IDS]> = {
  simulation: PROMPT_IDS.SIMULATION_CONTENT,
  diagram: PROMPT_IDS.DIAGRAM_CONTENT,
  code: PROMPT_IDS.CODE_CONTENT,
  game: PROMPT_IDS.GAME_CONTENT,
  visualization3d: PROMPT_IDS.VISUALIZATION3D_CONTENT,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, instruction, widgetType, currentHtml, widgetConfig, languageDirective } =
      body as {
        mode: 'regenerate' | 'patch';
        instruction: string;
        widgetType?: WidgetType;
        currentHtml?: string;
        widgetConfig?: WidgetConfig;
        languageDirective?: string;
      };

    if (!instruction?.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'instruction is required');
    }
    if (mode === 'regenerate' && !widgetType) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'widgetType is required for regenerate mode');
    }
    if (mode === 'patch' && !currentHtml) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'currentHtml is required for patch mode');
    }

    const {
      model: languageModel,
      modelInfo,
      thinkingConfig,
    } = await resolveModelFromRequest(req, body);

    const aiCall: AICallFn = async (systemPrompt, userPrompt) => {
      const result = await callLLM(
        {
          model: languageModel,
          system: systemPrompt,
          prompt: userPrompt,
          maxOutputTokens: modelInfo?.outputWindow,
        },
        'interactive-edit',
        undefined,
        thinkingConfig,
      );
      return result.text;
    };

    let html: string | null = null;

    if (mode === 'patch') {
      const prompts = buildPrompt(PROMPT_IDS.INTERACTIVE_PATCH, {
        currentHtml: currentHtml!,
        instruction: instruction.trim(),
      });
      if (!prompts) return apiError('INTERNAL_ERROR', 500, 'Failed to build patch prompt');
      const response = await aiCall(prompts.system, prompts.user);
      html = extractHtml(response);
    } else {
      // regenerate
      const promptId = WIDGET_PROMPT_ID[widgetType!];
      const variables = buildRegenerateVariables(
        widgetType!,
        widgetConfig,
        instruction.trim(),
        languageDirective || '',
      );
      const prompts = buildPrompt(promptId, variables);
      if (!prompts) return apiError('INTERNAL_ERROR', 500, 'Failed to build regenerate prompt');

      // Append current config as reference so AI knows what exists
      const userWithContext =
        prompts.user +
        (widgetConfig
          ? `\n\n## Current Widget Config (for reference)\n\`\`\`json\n${JSON.stringify(widgetConfig, null, 2)}\n\`\`\``
          : '');
      const response = await aiCall(prompts.system, userWithContext);
      html = extractHtml(response);
    }

    if (!html) return apiError('INTERNAL_ERROR', 500, 'Failed to extract HTML from AI response');

    const processedHtml = postProcessInteractiveHtml(html);
    const newWidgetConfig = extractWidgetConfig(processedHtml);

    // Regenerate teacher actions only for regenerate mode
    let teacherActions;
    if (mode === 'regenerate' && widgetType && newWidgetConfig) {
      // Build a minimal outline-like object for teacher action generation
      const pseudoOutline = {
        type: 'interactive' as const,
        id: '',
        title: (newWidgetConfig as { concept?: string }).concept || '',
        description: (newWidgetConfig as { description?: string }).description || '',
        keyPoints: [],
        order: 0,
        widgetType,
        widgetOutline: {},
      };
      teacherActions = await generateWidgetTeacherActions(
        widgetType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pseudoOutline as any,
        newWidgetConfig,
        aiCall,
        languageDirective,
      );
    }

    return apiSuccess({ html: processedHtml, widgetConfig: newWidgetConfig, teacherActions });
  } catch (err) {
    console.error('[interactive-edit] failed:', err);
    return apiError('INTERNAL_ERROR', 500, 'Internal error');
  }
}
