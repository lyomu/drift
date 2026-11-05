import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

typedef ArticleReaderControllerFactory =
    ArticleReaderController Function({
      required Uri initialUri,
      required ValueChanged<int> onProgress,
      required VoidCallback onPageStarted,
      required VoidCallback onPageFinished,
      required ValueChanged<String> onPageError,
      required ValueChanged<String> onBlockedNavigation,
    });

/// Small boundary around the native WebView. The detail screen depends on this
/// interface so its loading, failure, retry, and back behavior stay testable.
abstract interface class ArticleReaderController {
  Widget buildView();

  Future<bool> canGoBack();

  Future<void> goBack();

  Future<void> reload();
}

bool isSafeArticleUri(Uri uri) =>
    uri.scheme == 'https' && uri.host.isNotEmpty && uri.userInfo.isEmpty;

ArticleReaderController createArticleReaderController({
  required Uri initialUri,
  required ValueChanged<int> onProgress,
  required VoidCallback onPageStarted,
  required VoidCallback onPageFinished,
  required ValueChanged<String> onPageError,
  required ValueChanged<String> onBlockedNavigation,
}) => WebViewArticleReaderController(
  initialUri: initialUri,
  onProgress: onProgress,
  onPageStarted: onPageStarted,
  onPageFinished: onPageFinished,
  onPageError: onPageError,
  onBlockedNavigation: onBlockedNavigation,
);

class WebViewArticleReaderController implements ArticleReaderController {
  WebViewArticleReaderController({
    required Uri initialUri,
    required ValueChanged<int> onProgress,
    required VoidCallback onPageStarted,
    required VoidCallback onPageFinished,
    required ValueChanged<String> onPageError,
    required ValueChanged<String> onBlockedNavigation,
  }) {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: onProgress,
          onPageStarted: (_) => onPageStarted(),
          onPageFinished: (_) => onPageFinished(),
          onWebResourceError: (error) {
            if (error.isForMainFrame ?? true) {
              onPageError(error.description);
            }
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null || !isSafeArticleUri(uri)) {
              onBlockedNavigation(request.url);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(initialUri);
  }

  late final WebViewController _controller;

  @override
  Widget buildView() => WebViewWidget(controller: _controller);

  @override
  Future<bool> canGoBack() => _controller.canGoBack();

  @override
  Future<void> goBack() => _controller.goBack();

  @override
  Future<void> reload() => _controller.reload();
}
