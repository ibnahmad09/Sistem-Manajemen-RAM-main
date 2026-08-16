<?php

test('guests are redirected to the login page from the home route', function () {
    $response = $this->get(route('home'));

    $response->assertRedirect('/login');
});
