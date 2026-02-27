import { BuiltinMask } from "./typing";
import { SYSTEM_PROMPT } from "./system-prompt";

export const CN_MASKS: BuiltinMask[] = [
  {
    avatar: "1f638",
    name: "温州智游大模型",
    context: [
      {
        id: "wl",
        role: "system",
        content: SYSTEM_PROMPT,
        date: "",
      },
    ],
    modelConfig: {
      model: "glm-5",
      temperature: 1,
      max_tokens: 20000,
      presence_penalty: 0,
      frequency_penalty: 0,
      sendMemory: true,
      historyMessageCount: 5,
      compressMessageLengthThreshold: 1000,
    },
    lang: "cn",
    builtin: true,
    createdAt: 1688899480511,
  },
];