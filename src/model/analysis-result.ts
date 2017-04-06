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

import {Document, FeatureKinds, QueryOptions as DocumentQueryOptions} from './document';
import {Feature} from './feature';
import {BaseQueryOptions, Queryable} from './queryable';
import {Warning} from './warning';

export type QueryOptions = object & BaseQueryOptions & {
  /**
   * When querying an AnalysisResult, results from multiple
   * documents may show up, so disallowing following imports
   * probably doesn't make sense. So we allow specifying imported,
   * but it must be true.
   */
  imported?: true;
};

// A regexp that matches paths to external code.
// TODO(rictic): Make this extensible (polymer.json?).
// Note that we match directories named exactly `build`, but will match any
// directory name prefixed by `bower_components` or `node_modules`, in order to
// ignore `polymer install`'s variants, which look like bower_components-foo
const MATCHES_EXTERNAL = /(^|\/)(bower_components|node_modules|build($|\/))/;

/**
 * Represents a queryable interface over all documents in a package/project.
 *
 * Results of queries will include results from all documents in the package, as
 * well as from external dependencies that are transitively imported by
 * documents in the package.
 */
export class AnalysisResult implements Queryable {
  private _results: Map<string, Document | Warning>;
  private _searchRoots: Set<Document>;

  static isExternal(path: string) {
    return MATCHES_EXTERNAL.test(path);
  }

  constructor(results: Map<string, Document | Warning>) {
    this._results = results;
    const documents = Array.from(results.values()).filter((r) => r instanceof Document) as Document[];
    const potentialRoots = new Set(documents);

    // We trim down the set of documents as a performance optimization. We only
    // need a set of documents such that all other documents we're interested in
    // can be reached from them. That way we'll do less duplicate work when we
    // query over all documents.
    for (const doc of potentialRoots) {
      for (const imprt of doc.getByKind('import', {imported: true})) {
        // When there's cycles we can keep any element of the cycle, so why not
        // this one.
        if (imprt.document !== doc) {
          potentialRoots.delete(imprt.document);
        }
      }
    }
    this._searchRoots = potentialRoots;
  }

  getDocument(url: string): Document | Warning | undefined {
    return this._results.get(url);
  }

  getByKind<K extends keyof FeatureKinds>(kind: K, options?: QueryOptions):
      Set<FeatureKinds[K]>;
  getByKind(kind: string, options?: QueryOptions): Set<Feature>;
  getByKind(kind: string, options?: QueryOptions): Set<Feature> {
    const result = new Set();
    const docQueryOptions = this._getDocumentQueryOptions(options);
    for (const doc of this._searchRoots) {
      addAll(result, doc.getByKind(kind, docQueryOptions));
    }
    return result;
  }

  getById<K extends keyof FeatureKinds>(
      kind: K, identifier: string,
      options?: QueryOptions): Set<FeatureKinds[K]>;
  getById(kind: string, identifier: string, options?: QueryOptions):
      Set<Feature>;
  getById(kind: string, identifier: string, options?: QueryOptions):
      Set<Feature> {
    const result = new Set();
    const docQueryOptions = this._getDocumentQueryOptions(options);
    for (const doc of this._searchRoots) {
      addAll(result, doc.getById(kind, identifier, docQueryOptions));
    }
    return result;
  }

  getOnlyAtId<K extends keyof FeatureKinds>(
      kind: K, identifier: string,
      options?: QueryOptions): FeatureKinds[K]|undefined;
  getOnlyAtId(kind: string, identifier: string, options?: QueryOptions): Feature
      |undefined;
  getOnlyAtId(kind: string, identifier: string, options?: QueryOptions): Feature
      |undefined {
    const results = this.getById(kind, identifier, options);
    if (results.size > 1) {
      throw new Error(
          `Expected to find at most one ${kind} with id ${identifier} ` +
          `but found ${results.size}.`);
    };
    return results.values().next().value || undefined;
  }

  /**
   * Get all features for all documents in the project or their imports.
   */
  getFeatures(options?: QueryOptions): Set<Feature> {
    const result = new Set();
    const docQueryOptions = this._getDocumentQueryOptions(options);
    for (const doc of this._searchRoots) {
      addAll(result, doc.getFeatures(docQueryOptions));
    }
    return result;
  }

  /**
   * Get all warnings in the project.
   */
  getWarnings(options?: QueryOptions): Warning[] {
    const warnings = Array.from(this._results.values()).filter((r) => !(r instanceof Document)) as Warning[];
    const result = new Set(warnings);
    const docQueryOptions = this._getDocumentQueryOptions(options);
    for (const doc of this._searchRoots) {
      addAll(result, new Set(doc.getWarnings(docQueryOptions)));
    }
    return Array.from(result);
  }

  private _getDocumentQueryOptions(options?: QueryOptions):
      DocumentQueryOptions {
    options = options || {};
    return {
      imported: true,
      externalPackages: options.externalPackages,
      noLazyImports: options.noLazyImports
    };
  }
}

// TODO(justinfagnani): move to utils
function addAll<T>(set1: Set<T>, set2: Set<T>): Set<T> {
  for (const val of set2) {
    set1.add(val);
  }
  return set1;
}