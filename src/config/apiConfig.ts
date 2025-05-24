/**
 * API configuration
 *
 * This file contains the configuration for API endpoints.
 * It uses environment variables to determine the base URL.
 */

// Get the API base URL from environment variables
// In development, this will be set by Vite from .env file
// In production, this will be set during the build process
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// API endpoints
export const API_ENDPOINTS = {
  OCR: `${API_BASE_URL}/ocr`,
  MODEL: `${API_BASE_URL}/model`,
  CONNECTIVITY: `${API_BASE_URL}/connectivity`,
  EVALUATE_ANSWER: `${API_BASE_URL}/evaluate-answer`,
  OPENAI: `${API_BASE_URL}/openai`
};

// OCR API configuration
// You can get a free API key from https://ocr.space/ocrapi
// For better results, consider upgrading to a paid plan
export const OCR_API_KEY = "K89889795888957"; // OCR.space API key (free tier)

// OpenAI API configuration
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ""; // OpenAI API key - set in environment variables
export const DEFAULT_OPENAI_MODEL = "gpt-3.5-turbo"; // Default OpenAI model
export const OPENAI_MODELS = ["gpt-3.5-turbo", "gpt-4"]; // Available OpenAI models

// Azure OpenAI configuration for OCR
export const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || "";
export const AZURE_OPENAI_MODEL = "gpt-4.1-nano";
export const AZURE_OPENAI_DEPLOYMENT = "gpt-4.1-nano";
export const AZURE_OPENAI_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY || "";
export const AZURE_OPENAI_API_VERSION = "2024-12-01-preview";

// Default model to use for all operations
export const DEFAULT_MODEL = "openai"; // Using OpenAI as the primary model
