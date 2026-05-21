# Gauntlet Predictor — Project Context

## What this is
A Python CLI tool that predicts lap times for the Gauntlet event in Asphalt Legends.
36 confirmed 30-second tracks. Takes car stats as input. Recommends optimal 5-car
lineup using the Hungarian assignment algorithm.

## Tech stack
- Python 3.11+
- typer[all] + rich (CLI and output)
- numpy + scipy (math and Hungarian algo)
- scikit-learn (ridge regression for calibration)
- pytest (testing)

## Rules
- Always write pytest tests for every pure function
- Use dataclasses for models, not Pydantic
- Store all data as JSON/JSONL in the data/ directory
- Never use a database or server
- Build one phase at a time — do not build ahead
- Track weights must always sum to 1.0
