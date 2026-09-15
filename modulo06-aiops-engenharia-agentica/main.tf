terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}

# S3 Bucket - nexus_apollo_data
resource "aws_s3_bucket" "nexus_apollo_data" {
  bucket = "nexus-apollo-data-${data.aws_caller_identity.current.account_id}"
}

# S3 Bucket - nexus_apollo_logs
resource "aws_s3_bucket" "nexus_apollo_logs" {
  bucket = "nexus-apollo-logs"
}

# KMS Key Policy Document
data "aws_iam_policy_document" "nexus_apollo_kms" {
  statement {
    sid    = "EnableIAMUserPermissions"
    effect = "Allow"

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
      ]
    }

    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowTerraformKeyAdministration"
    effect = "Allow"

    principals {
      type = "AWS"
      identifiers = [
        data.aws_caller_identity.current.arn
      ]
    }

    actions   = ["kms:*"]
    resources = ["*"]
  }
}

# KMS Key
resource "aws_kms_key" "nexus_apollo" {
  description             = "KMS key for Nexus Apollo"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.nexus_apollo_kms.json
}

# S3 Versioning for nexus_apollo_logs
resource "aws_s3_bucket_versioning" "nexus_apollo_logs" {
  bucket = aws_s3_bucket.nexus_apollo_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Server Side Encryption for nexus_apollo_logs
resource "aws_s3_bucket_server_side_encryption_configuration" "nexus_apollo_logs" {
  bucket = aws_s3_bucket.nexus_apollo_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.nexus_apollo.arn
    }
    bucket_key_enabled = true
  }
}

# S3 Public Access Block for nexus_apollo_logs
resource "aws_s3_bucket_public_access_block" "nexus_apollo_logs" {
  bucket = aws_s3_bucket.nexus_apollo_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Lifecycle Configuration for nexus_apollo_logs
resource "aws_s3_bucket_lifecycle_configuration" "nexus_apollo_logs" {
  bucket = aws_s3_bucket.nexus_apollo_logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    filter {}

    expiration {
      days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}