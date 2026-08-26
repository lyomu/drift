import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/global_search_repository.dart';

typedef GlobalSearchRequest = ({
  String query,
  GlobalSearchFilter filter,
});

// `.autoDispose` is load-bearing here, not just the house convention: this is
// a `.family` keyed on the query string, so without it every distinct search
// a user ever types keeps its result list alive for the rest of the session.
final globalSearchProvider = FutureProvider.autoDispose
    .family<List<GlobalSearchResult>, GlobalSearchRequest>((ref, request) {
      return ref
          .watch(globalSearchRepositoryProvider)
          .search(query: request.query, filter: request.filter);
    });
