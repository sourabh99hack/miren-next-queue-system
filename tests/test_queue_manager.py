from services.queue_manager import QueueManager


def test_first_register_becomes_current():
    queue = QueueManager()

    queue.request_register(3)

    status = queue.get_status()

    assert status["current_register"] == 3
    assert status["queue"] == []


def test_registers_are_added_in_order():
    queue = QueueManager()

    queue.request_register(3)
    queue.request_register(1)
    queue.request_register(4)

    status = queue.get_status()

    assert status["current_register"] == 3
    assert status["queue"] == [1, 4]


def test_duplicate_register_is_not_added():
    queue = QueueManager()

    queue.request_register(3)
    queue.request_register(1)
    queue.request_register(1)

    status = queue.get_status()

    assert status["queue"] == [1]


def test_complete_moves_to_next_register():
    queue = QueueManager()

    queue.request_register(3)
    queue.request_register(1)
    queue.request_register(4)

    result = queue.complete_current()

    assert result["completed"] == 3
    assert result["next"] == 1

    status = queue.get_status()

    assert status["current_register"] == 1
    assert status["queue"] == [4]


def test_empty_queue():
    queue = QueueManager()

    status = queue.get_status()

    assert status["current_register"] is None
    assert status["queue"] == []


def test_invalid_register():
    queue = QueueManager()

    try:
        queue.request_register(5)
        assert False
    except ValueError:
        assert True