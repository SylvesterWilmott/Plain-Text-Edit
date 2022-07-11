"use strict";

export const UL_REGEX = /^((\t*[-\*]+) {1,})(.+)?$/gm;
export const OL_REGEX = /^((\t*[0-9]+)\. {1,})(.+)?$/gm;
export const CL_REGEX = /^((\t*- ?\[x? ?\]) {1,})(.+)?$/gm;
export const WORD_REGEX = /\w/g;
export const WHITESPACE_REGEX = /\s/g;
export const CHARACTER_REGEX = /[a-z0-9]/gi;
