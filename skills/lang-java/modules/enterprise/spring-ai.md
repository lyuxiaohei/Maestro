# Spring AI 集成规范

> 本文件定义 Spring AI 相关的开发规范，用户可根据实际使用的 AI 模型和服务调整。

---

## Prompt 模板管理

```java
// 正确：使用 PromptTemplate，模板外置到 resources/prompts/
@Value("classpath:prompts/analysis.st")
private Resource promptResource;

PromptTemplate template = new PromptTemplate(promptResource);
Prompt prompt = template.create(Map.of("input", userInput));

// 禁止：硬编码 prompt 字符串
// String prompt = "你是一个助手，请分析：" + userInput;  // ❌
```

---

## 模型调用封装

```java
// 正确：封装在 Service 层，统一处理异常和重试
@Service
public class AiAnalysisService {
    private final ChatClient chatClient;

    public String analyze(String input) {
        try {
            return chatClient.prompt()
                .user(input)
                .call()
                .content();
        } catch (AiException e) {
            log.error("AI 调用失败，input_length={}", input.length(), e);
            throw new BusinessException("AI 分析暂不可用，请稍后重试");
        }
    }
}

// 禁止：在 Controller 中直接调用 ChatClient
```

---

## 模型配置外置

```yaml
# application.yml — 所有模型参数必须外置，禁止硬编码
spring:
  ai:
    openai:
      api-key: ${AI_API_KEY}          # 从环境变量读取，禁止明文写入
      base-url: ${AI_BASE_URL}
      chat:
        options:
          model: ${AI_MODEL:gpt-4o}
          temperature: 0.7
```
