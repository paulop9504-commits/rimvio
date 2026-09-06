# Rimvio AI Action Standard

## Purpose

Rimvio AI Action Standard defines a machine-readable contract for turning human knowledge and operational rules into safe, verifiable AI actions.

## Core model

Human Knowledge → Standard → AI Plan → Runtime Execution → Verification → Reusable Capability

## Standard layers

1. Runtime — where an action may execute.
2. Action — primitive operations available to an agent.
3. Permission — what the agent is allowed to do.
4. Constraint — conditions and limits that must hold.
5. Security — sandboxing, identity, secrets, network policy, audit, and rollback.
6. Verification — objective conditions for determining success or failure.

## Design principle

People define goals, policies, permissions, constraints, and success criteria. Agents determine the concrete action sequence within those boundaries.

## Initial capability contract

Every capability should make its identity, runtime, inputs, outputs, actions, permissions, constraints, security requirements, and verification criteria explicit.

## Lifecycle

CREATE → DESIGN → BUILD → RUN → OBSERVE → VERIFY → REPAIR → VALIDATE → PUBLISH → MONITOR → IMPROVE

## Safety rule

A capability must not infer authority merely because an action is technically possible. Permission and approval requirements are part of the contract.

## Status

This document describes the proposed Rimvio standard. It is an evolving internal specification and is not an industry-standard specification.
