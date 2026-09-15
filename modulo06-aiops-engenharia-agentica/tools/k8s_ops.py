import os
import subprocess
import re

from crewai.tools import tool


@tool("generate_k8s_manifest")
def generate_k8s_manifest(
    app_name: str,
    replicas: int,
    port: int
) -> str:
    """Generates Kubernetes Deployment and Service YAML manifests on disk."""

    manifest = f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: {app_name}
spec:
  replicas: {replicas}
  selector:
    matchLabels:
      app: {app_name}
  template:
    metadata:
      labels:
        app: {app_name}
    spec:
      containers:
      - name: {app_name}
        image: nginx:latest
        ports:
        - containerPort: {port}
        readinessProbe:
          httpGet:
            path: /
            port: {port}
---
apiVersion: v1
kind: Service
metadata:
  name: {app_name}-svc
spec:
  selector:
    app: {app_name}
  ports:
  - protocol: TCP
    port: 80
    targetPort: {port}
"""

    filename = f"{app_name}-k8s.yaml"

    with open(filename, "w", encoding="utf-8") as file:
        file.write(manifest)

    return (
        f"✅ Kubernetes manifests for '{app_name}' "
        f"successfully generated in '{filename}'."
    )


@tool("apply_k8s_manifest")
def apply_k8s_manifest(filename: str) -> str:
    """Applies a Kubernetes manifest to the local Minikube cluster."""

    if not os.path.exists(filename):
        return f"❌ Error: The file '{filename}' was not found to apply."

    try:
        result = subprocess.run(
            [
                "minikube",
                "kubectl",
                "--",
                "apply",
                "-f",
                filename
            ],
            capture_output=True,
            text=True,
            check=False
        )

        stdout = result.stdout.strip()
        stderr = result.stderr.strip()

        if result.returncode == 0:
            return (
                f"✅ Kubernetes Apply Success\n"
                f"{stdout}"
            )

        return (
            f"❌ Kubernetes Apply Failed\n"
            f"Exit code: {result.returncode}\n"
            f"{stderr or stdout}"
        )

    except FileNotFoundError:
        return (
            "❌ Error: 'minikube' command line tool was not found."
        )

    except Exception as error:
        return (
            f"❌ Unexpected error applying Kubernetes manifest: "
            f"{str(error)}"
        )


@tool("analyze_canary_metrics")
def analyze_canary_metrics(metrics_data: str) -> str:
    """Analyzes application metrics to decide if a Canary Rollout should proceed or rollback."""

    match = re.search(
        r"error_rate\s*:\s*([0-9]+(?:\.[0-9]+)?)%",
        metrics_data,
        re.IGNORECASE
    )

    if not match:
        return (
            "⚠️ UNKNOWN: Could not identify 'error_rate' "
            "in the provided metrics."
        )

    error_rate = float(match.group(1))

    if error_rate > 5:
        return (
            f"❌ ROLLBACK: Elevated error rate detected "
            f"({error_rate}%). Limit is 5%."
        )

    return (
        f"✅ PROCEED: Error rate is stable "
        f"({error_rate}%). Canary rollout approved."
    )