---
title: 简单说说 FHIR Transaction Bundle
date: 2026-03-12 22:07:48
tags: [Technique]
---

FHIR Transaction Bundle 主要解决这一类问题:

> 假设你要创建一个 Patient，再创建一个属于这个患者的 Observation，两个必须同时成功或同时失败。用普通 REST API，你得先 POST Patient，拿到 ID，再 POST Observation，如果中间失败了还得自己回滚。FHIR 的 transaction 就是把这个流程标准化成类似数据库的事务操作或说是 “原子操作” ，整组操作要么全成功，要么全失败，而且可以在同一个 bundle 里直接引用还没创建的资源。

transaction bundle 和 batch bundle 的区别是，batch 把多个请求一起提交，每个独立处理，一部分成功一部分失败是允许的。Transaction 是把所有请求当原子单元处理，任一失败则整体回滚。Medplum 文档说得很直接：batch 是独立处理，transaction 是原子处理。

然后看一个最基础的例子。同时创建 Patient 和 Observation，Observation 引用这个新建的 Patient：

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:patient-1",
      "request": {
        "method": "POST",
        "url": "Patient"
      },
      "resource": {
        "resourceType": "Patient",
        "name": [{ "family": "Doe", "given": ["Jane"] }]
      }
    },
    {
      "fullUrl": "urn:uuid:observation-1",
      "request": {
        "method": "POST",
        "url": "Observation"
      },
      "resource": {
        "resourceType": "Observation",
        "status": "final",
        "code": { "text": "Body Weight" },
        "subject": { "reference": "urn:uuid:patient-1" },
        "valueQuantity": { "value": 68, "unit": "kg" }
      }
    }
  ]
}
```

这里的关键是 `fullUrl` 和 `urn:uuid`。`fullUrl` 给 bundle 内还没创建的资源一个临时身份，其他资源通过这个 `urn:uuid` 引用它。服务端创建资源后会把内部引用替换成真实地址。

FHIR R4 规范对 transaction 有几个硬性规则，这些规则直接影响你怎么设计 bundle。

第一，原子性，要么全成功要么全失败。

第二，处理结果不依赖 entry 顺序。这是我踩坑的地方。不能把 transaction 当成"按顺序执行的脚本"。FHIR 明确规定了服务端处理顺序：先 DELETE，再 POST，再 PUT/PATCH，最后 GET 和解析条件引用。所以写 bundle 的时候不能依赖"先 A 再 B"这种逻辑。

第三，同一资源身份在一个 transaction 中只能出现一次。这是规范层面的限制，不是"可能出问题"，而是规范直接说 SHALL fail。

举个反面例子。我想在一个 transaction 里先 PATCH 一个资源补审计字段，再 DELETE 同一个资源：

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "request": { "method": "PATCH", "url": "Observation/obs-1" },
      "resource": { "resourceType": "Parameters" }
    },
    {
      "request": { "method": "DELETE", "url": "Observation/obs-1" }
    }
  ]
}
```

这个 bundle 从规范层面就不合法。原因有两个：一是服务端不会按你写的顺序处理，DELETE 先于 PATCH；二是同一个资源 `Observation/obs-1` 在 transaction 里出现了两次，构成身份重叠，规范要求失败。

再说 DELETE。FHIR 的 DELETE 不是物理删除。从普通读取角度看，资源返回 410 Gone；从搜索角度看，资源不再出现；但如果服务端维护版本历史，`_history` 里仍然有记录，而且删除本身会形成一个"被标记为 deleted 的特殊历史版本"。规范还提到被删除的资源可以通过后续 PUT update "bring back to life"。

这对审计设计有直接影响。如果想把删除审计写在主资源的 extension 里（比如 deletedBy、deletedAt），就不能用一个 transaction 搞定，因为同一个资源不能既 PATCH 又 DELETE。你得接受两步法：先更新资源写审计信息，再执行 DELETE。代价是多出一个预删除版本，但好处是审计信息确实留在了主资源历史里。

什么时候该用 transaction？比如多资源必须原子操作的场景，资源间存在内部引用的场景，希望服务端负责一致性边界的场景。

什么时候不该用？比如只是想减少 HTTP 请求次数的，用 batch；bundle 太大事务太重的，某些资源本来就适合异步处理的。

## 参考资料

- FHIR R4 RESTful API  
  https://hl7.org/fhir/R4/http.html
- FHIR R4 Transaction Processing Rules  
  https://hl7.org/fhir/R4/http.html#transaction
- FHIR R4 Delete Interaction  
  https://hl7.org/fhir/R4/http.html#delete
- Medplum: FHIR Batch Requests  
  https://www.medplum.com/docs/fhir-datastore/fhir-batch-requests
