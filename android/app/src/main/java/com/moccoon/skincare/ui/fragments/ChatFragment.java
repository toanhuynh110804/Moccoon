package com.moccoon.skincare.ui.fragments;

import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.chip.Chip;
import com.moccoon.skincare.R;
import com.moccoon.skincare.data.api.ApiClient;
import com.moccoon.skincare.data.api.ApiService;
import com.moccoon.skincare.data.api.SocketManager;
import com.moccoon.skincare.data.models.ApiResponse;
import com.moccoon.skincare.data.models.ChatMessage;
import com.moccoon.skincare.data.models.ConversationData;
import com.moccoon.skincare.ui.adapters.ChatMessageAdapter;
import com.moccoon.skincare.utils.SessionManager;
import io.socket.client.Socket;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ChatFragment extends Fragment {
    private static final String TAG = "ChatFragment";
    private RecyclerView rvMessages;
    private EditText etMessage;
    private ImageButton btnSend;
    private TextView tvTyping;

    private ChatMessageAdapter messageAdapter;
    private ApiService apiService;
    private SessionManager sessionManager;
    private Socket mSocket;
    private int conversationId = 0;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_chat, container, false);

        apiService = ApiClient.getApiService(requireContext());
        sessionManager = new SessionManager(requireContext());

        rvMessages = view.findViewById(R.id.rvChatMessages);
        etMessage = view.findViewById(R.id.etChatMessage);
        btnSend = view.findViewById(R.id.btnSendMessage);
        tvTyping = view.findViewById(R.id.tvTypingIndicator);

        messageAdapter = new ChatMessageAdapter();
        LinearLayoutManager layoutManager = new LinearLayoutManager(requireContext());
        layoutManager.setStackFromEnd(true);
        rvMessages.setLayoutManager(layoutManager);
        rvMessages.setAdapter(messageAdapter);

        setupSuggestionChips(view);
        btnSend.setOnClickListener(v -> sendMessage());

        loadConversation();

        return view;
    }

    private void setupSuggestionChips(View view) {
        Chip chip1 = view.findViewById(R.id.chipSuggestion1);
        Chip chip2 = view.findViewById(R.id.chipSuggestion2);
        Chip chip3 = view.findViewById(R.id.chipSuggestion3);

        View.OnClickListener listener = v -> {
            Chip chip = (Chip) v;
            etMessage.setText(chip.getText());
            sendMessage();
        };

        if (chip1 != null) chip1.setOnClickListener(listener);
        if (chip2 != null) chip2.setOnClickListener(listener);
        if (chip3 != null) chip3.setOnClickListener(listener);
    }

    private void loadConversation() {
        apiService.getConversation().enqueue(new Callback<ApiResponse<ConversationData>>() {
            @Override
            public void onResponse(Call<ApiResponse<ConversationData>> call, Response<ApiResponse<ConversationData>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    conversationId = response.body().getData().getId();
                    connectSocket();
                    loadMessages();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<ConversationData>> call, Throwable t) {
                Log.e(TAG, "Lỗi tải conversation: " + t.getMessage());
            }
        });
    }

    private void loadMessages() {
        if (conversationId == 0) return;
        apiService.getMessages(conversationId).enqueue(new Callback<ApiResponse<List<ChatMessage>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<ChatMessage>>> call, Response<ApiResponse<List<ChatMessage>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    messageAdapter.setMessages(response.body().getData());
                    if (messageAdapter.getItemCount() > 0) {
                        rvMessages.scrollToPosition(messageAdapter.getItemCount() - 1);
                    }
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<ChatMessage>>> call, Throwable t) {}
        });
    }

    private void connectSocket() {
        String token = sessionManager.getToken();
        if (token == null || token.isEmpty()) return;

        mSocket = SocketManager.getSocket(token);
        if (mSocket != null) {
            mSocket.emit("join_conversation", conversationId);

            mSocket.on("receive_message", args -> {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    try {
                        JSONObject data = (JSONObject) args[0];
                        ChatMessage msg = new ChatMessage(
                                data.optInt("conversation_id"),
                                data.optInt("sender_id"),
                                data.optString("sender_type"),
                                data.optString("message_text")
                        );
                        messageAdapter.addMessage(msg);
                        rvMessages.smoothScrollToPosition(messageAdapter.getItemCount() - 1);
                    } catch (Exception e) {
                        Log.e(TAG, "Socket parse error: " + e.getMessage());
                    }
                });
            });
        }
    }

    private void sendMessage() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty() || conversationId == 0) return;

        etMessage.setText("");

        // Gửi qua REST API
        Map<String, Object> body = new HashMap<>();
        body.put("conversation_id", conversationId);
        body.put("message_text", text);

        apiService.sendMessage(body).enqueue(new Callback<ApiResponse<ChatMessage>>() {
            @Override
            public void onResponse(Call<ApiResponse<ChatMessage>> call, Response<ApiResponse<ChatMessage>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    ChatMessage sentMsg = response.body().getData();
                    messageAdapter.addMessage(sentMsg);
                    rvMessages.smoothScrollToPosition(messageAdapter.getItemCount() - 1);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<ChatMessage>> call, Throwable t) {
                Toast.makeText(requireContext(), "Gửi tin nhắn thất bại: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mSocket != null && conversationId != 0) {
            mSocket.emit("leave_conversation", conversationId);
        }
    }
}
