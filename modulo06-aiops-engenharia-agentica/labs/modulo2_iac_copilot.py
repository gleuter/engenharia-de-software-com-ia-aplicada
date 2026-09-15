import os
import sys

# Ensure project root is in the Python path
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from crewai import Task, Crew, Process

from core.agents import get_architect, get_auditor
from tools.file_writer import write_file
from tools.security_scan import (
    run_terraform_validate,
    run_checkov_scan,
    validate_opa_policies,
)


# ============================================================
# AGENTS
# ============================================================

# Architect is responsible for creating and correcting main.tf
architect = get_architect(
    tools=[
        write_file,
        run_terraform_validate,
    ]
)

# Auditor is responsible only for validating the file
auditor = get_auditor(
    tools=[
        run_terraform_validate,
        run_checkov_scan,
        validate_opa_policies,
    ]
)


# ============================================================
# TASK 1 - GENERATE TERRAFORM
# ============================================================

task_gerar = Task(
    description="""
    Gere um arquivo 'main.tf' para um bucket S3 seguro
    chamado 'nexus-apollo-data'.

    A região deve ser us-east-1.

    Utilize AWS Provider ~> 5.0.

    Regras obrigatórias:
    - Gere código Terraform válido e compatível com AWS Provider v5.
    - Não crie dependências circulares entre recursos.
    - O bucket de access logs não deve enviar logs de volta
      para o bucket de origem.
    - Em aws_s3_bucket_lifecycle_configuration utilize:
      abort_incomplete_multipart_upload {
        days_after_initiation = 7
      }
    - Em aws_iam_policy_document utilize 'condition', nunca 'conditions'.
    - Em aws_sns_topic_policy utilize o argumento 'arn', nunca 'topic'.
    - Em aws_iam_openid_connect_provider utilize o atributo '.arn',
      nunca '.oidc_arn'.
    - Não utilize 'region' dentro do bloco destination de
      aws_s3_bucket_replication_configuration.

    Utilize a ferramenta write_file para salvar o arquivo.
    """,
    expected_output="Arquivo main.tf gerado com sucesso.",
    agent=architect,
)


# ============================================================
# TASK 2 - SECURITY AND GOVERNANCE AUDIT
# ============================================================

task_auditar = Task(
     description="""
    Valide o arquivo 'main.tf'.

    Execute obrigatoriamente as ferramentas nesta ordem:
    1. run_terraform_validate
    2. run_checkov_scan
    3. validate_opa_policies

    Não altere o arquivo main.tf.

    Diferencie claramente:
    - erros técnicos do Terraform;
    - falhas de segurança do Checkov;
    - violações de governança do OPA.

    Não invente falhas que não tenham sido retornadas pelas ferramentas.

    O relatório produzido será utilizado pelo arquiteto na
    próxima tarefa.
    """,
    expected_output="""
    Relatório de conformidade contendo os resultados do Terraform Validate,
    Checkov e OPA e todas as falhas encontradas.
    """,
    agent=auditor,
)


# ============================================================
# TASK 3 - CORRECT TERRAFORM
# ============================================================

task_corrigir = Task(
    description="""
    Analise o relatório de conformidade produzido pela tarefa
    de auditoria anterior.

    Se houver erros ou falhas, corrija o arquivo 'main.tf'.

    Utilize write_file para sobrescrever sempre o arquivo main.tf.
    Nunca crie outro arquivo .tf para a correção.

    Após salvar a correção, execute obrigatoriamente
    run_terraform_validate.

    Se o Terraform Validate falhar:
    1. Analise os erros retornados.
    2. Corrija novamente o main.tf.
    3. Sobrescreva o main.tf.
    4. Execute run_terraform_validate novamente.

    Regras:
    - preserve compatibilidade com AWS Provider ~> 5.0;
    - não crie dependências circulares;
    - aws_iam_policy_document deve ser data, nunca resource;
    - em aws_sns_topic_policy utilize arn, nunca topic;
    - em aws_s3_bucket_lifecycle_configuration utilize
      status = "Enabled", nunca enabled = true;
    - em aws_s3_bucket_lifecycle_configuration, cada rule deve possuir
      filter {} ou prefix, mas nunca ambos;
    - utilize abort_incomplete_multipart_upload com
      days_after_initiation;
    - não configure o bucket de access logs para enviar logs
      de volta ao bucket de origem;
    - não adicione novos recursos que não sejam necessários para
      resolver os erros retornados pela auditoria;
    - se um recurso adicional criado anteriormente não for necessário
      para atender ao requisito original, remova-o;
    - não crie OIDC, GitHub Actions, Lambda, replicação ou outros
      serviços a menos que sejam explicitamente solicitados;
    - utilize somente as tools disponibilizadas ao agente;
    - nunca tente chamar tools inexistentes;
    - corrija somente o necessário.

    CONDIÇÃO DE PARADA:

    Assim que run_terraform_validate retornar sucesso:
    - pare imediatamente;
    - não altere mais o main.tf;
    - não chame write_file novamente;
    - não execute novas tools;
    - finalize a tarefa informando que o Terraform Validate passou.

    Somente continue corrigindo enquanto run_terraform_validate
    retornar falha.

    Como proteção contra loop infinito, faça no máximo 10 tentativas.
    Se após 10 tentativas o Terraform Validate ainda falhar,
    finalize informando claramente os erros restantes.
    """,
    expected_output="""
    Arquivo main.tf corrigido e resultado final do terraform validate,
    informando claramente se a configuração ficou válida.
    """,
    agent=architect,
    context=[task_auditar],
)

# ============================================================
# CREW
# ============================================================

nexus_pipeline = Crew(
    agents=[
        architect,
        auditor,
    ],
    tasks=[
        task_gerar,
        task_auditar,
        task_corrigir,
    ],
    process=Process.sequential,
    verbose=True,
)


# ============================================================
# EXECUTION
# ============================================================

if __name__ == "__main__":
    print("\n🚀 EXECUTANDO PIPELINE MODULAR (MÓDULO 2)\n")
    nexus_pipeline.kickoff()