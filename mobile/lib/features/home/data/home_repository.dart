import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

class HomeCard {
  const HomeCard({
    required this.id,
    required this.type,
    required this.priority,
    required this.title,
    required this.body,
  });

  final String id;
  final String type;
  final int priority;
  final String title;
  final String body;

  factory HomeCard.fromJson(Map<String, dynamic> json) => HomeCard(
    id: json['id'] as String,
    type: json['type'] as String,
    priority: json['priority'] as int,
    title: json['title'] as String,
    body: json['body'] as String,
  );
}

class HomeRepository {
  HomeRepository(this._dio);

  final Dio _dio;

  Future<List<HomeCard>> getFeed() async {
    try {
      final response = await _dio.get('/home/feed');
      final data = response.data as Map<String, dynamic>;
      final cards = data['cards'] as List<dynamic>;
      return cards
          .map((c) => HomeCard.fromJson(c as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }
}

final homeRepositoryProvider = Provider<HomeRepository>((ref) {
  return HomeRepository(ref.watch(dioClientProvider));
});
