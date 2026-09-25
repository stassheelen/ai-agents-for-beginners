package ua.prod.timetracker

import android.app.Application
import android.content.Context
import ua.prod.timetracker.di.AppContainer

class TimeTrackerApp : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        container.start()
    }
}

val Context.appContainer: AppContainer
    get() = (applicationContext as TimeTrackerApp).container
