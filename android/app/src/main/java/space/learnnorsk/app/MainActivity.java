package space.learnnorsk.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import space.learnnorsk.app.addword.QueueSync;
import space.learnnorsk.app.share.SharedImages;
import space.learnnorsk.app.share.SharedImagesPlugin;

public class MainActivity extends BridgeActivity {

    /**
     * Системные отступы (A10). Ставим свой слушатель инсетов ПОСЛЕ super.onCreate(): там
     * создаётся мост и грузятся плагины, включая SystemBars со своей раскладкой инсетов —
     * её мы осознанно перекрываем (почему — в SystemInsets).
     *
     * SharedImagesPlugin (A4), наоборот, регистрируем ДО super.onCreate(): мост поднимает
     * плагины внутри него, после — поздно. Сам интент разбираем уже после, чтобы фоновое
     * декодирование не гонялось с загрузкой WebView.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SharedImagesPlugin.class);
        super.onCreate(savedInstanceState);
        SystemInsets.apply(getBridge());
        SharedImages.handle(this, getIntent());
    }

    /**
     * Приложение уже запущено (launchMode=singleTask), пользователь шарит картинку —
     * система отдаёт интент сюда, а не в onCreate.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        SharedImages.handle(this, intent);
    }

    /**
     * Досылаем слова, которые нативный шит PROCESS_TEXT (A3) не смог отправить из-за сети.
     * Открытие приложения — единственный момент, когда токены точно свежие, а сеть,
     * скорее всего, есть. Вызов неблокирующий и молчит, если очередь пуста.
     */
    @Override
    public void onResume() {
        super.onResume();
        QueueSync.INSTANCE.syncAsync(this);
    }
}
