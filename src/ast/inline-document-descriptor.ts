/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {SourceLocation} from '../elements-format';

import {Descriptor} from './descriptor';

export interface LocationOffset {
  /** Zero based line index. */
  line: number;
  /** Zero based column index. */
  col: number;
  /**
   * The url of the source file.
   */
  filename?: string;
}

/**
 * Represents an inline document, usually a <script> or <style> tag in an HTML
 * document.
 *
 * @template N The AST node type
 */
export class InlineDocumentDescriptor<N> implements Descriptor {
  type: 'html'|'javascript'|'css'|/* etc */ string;

  contents: string;

  /** The location offset of this document within the containing document. */
  locationOffset: LocationOffset;

  /**
   * The AST node associated with this descriptor. This is required for correct
   * ordering of descriptors generated by different finders.
   */
  node: N;

  constructor(
      type: string, contents: string, node: N, locationOffset: LocationOffset) {
    this.type = type;
    this.contents = contents;
    this.node = node;
    this.locationOffset = locationOffset;
  }
}

export function correctSourceLocation(
    sourceLocation: SourceLocation,
    locationOffset?: LocationOffset): SourceLocation|undefined {
  if (!locationOffset || !sourceLocation) {
    return sourceLocation;
  }
  const result: SourceLocation = {
    line: sourceLocation.line + locationOffset.line,
    // The location offset column only matters for the first line.
    column: sourceLocation.column +
        (sourceLocation.line === 0 ? locationOffset.col : 0),
  };
  if (locationOffset.filename != null || sourceLocation.file != null) {
    result.file = locationOffset.filename || sourceLocation.file;
  }
  return result;
}